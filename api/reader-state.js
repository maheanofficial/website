import { listRows, upsertRows } from './_table-store.js';
import { readUsers } from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    isTrustedOrigin,
    json,
    readJsonBody
} from './_request-utils.js';
import { readSessionClaimsFromRequest } from './_auth-session.js';

const TABLE_NAME = 'reader_state';
const BODY_LIMIT_BYTES = 256 * 1024;
const READ_WINDOW_MS = 60_000;
const READ_MAX_REQUESTS = 180;
const WRITE_WINDOW_MS = 60_000;
const WRITE_MAX_REQUESTS = 80;
const HISTORY_LIMIT = 40;
const BOOKMARK_LIMIT = 60;
const COLLECTION_LIMIT = 20;
const COLLECTION_STORY_LIMIT = 200;
const DISMISSED_LIMIT = 500;

const toTrimmedString = (value) => String(value || '').trim();
const normalizeToken = (value) => toTrimmedString(value).toLowerCase();
const toArray = (value) => (Array.isArray(value) ? value : []);

const uniqueValues = (values, limit = 500) => {
    const seen = new Set();
    const out = [];
    toArray(values).forEach((entry) => {
        const normalized = toTrimmedString(entry);
        const key = normalizeToken(normalized);
        if (!normalized || !key || seen.has(key)) return;
        seen.add(key);
        out.push(normalized);
    });
    return out.slice(0, limit);
};

const normalizeIsoDate = (value, fallback = new Date().toISOString()) => {
    const parsed = Date.parse(toTrimmedString(value));
    if (!Number.isFinite(parsed)) return fallback;
    return new Date(parsed).toISOString();
};

const normalizeActivityItem = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const storyId = toTrimmedString(value.storyId);
    const storyTitle = toTrimmedString(value.storyTitle);
    const path = toTrimmedString(value.path);
    const partLabel = toTrimmedString(value.partLabel);
    if (!storyId || !storyTitle || !path || !partLabel) return null;

    const progress = Math.max(0, Math.min(100, Number(value.progress) || 0));
    const totalParts = Math.max(1, Math.floor(Number(value.totalParts) || 1));

    return {
        storyId,
        storySlug: toTrimmedString(value.storySlug) || undefined,
        storyTitle,
        path,
        partLabel,
        progress,
        totalParts,
        coverImage: toTrimmedString(value.coverImage) || undefined,
        updatedAt: normalizeIsoDate(value.updatedAt)
    };
};

const normalizeBookmark = (value) => {
    const activity = normalizeActivityItem(value);
    if (!activity) return null;
    return {
        ...activity,
        savedAt: normalizeIsoDate(value?.savedAt, activity.updatedAt)
    };
};

const normalizeCollection = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const id = toTrimmedString(value.id);
    const name = toTrimmedString(value.name);
    if (!id || !name) return null;
    const createdAt = normalizeIsoDate(value.createdAt);
    const updatedAt = normalizeIsoDate(value.updatedAt, createdAt);
    const storyIds = uniqueValues(value.storyIds, COLLECTION_STORY_LIMIT);
    return {
        id,
        name,
        storyIds,
        createdAt,
        updatedAt
    };
};

const normalizeFollows = (value) => {
    const now = new Date().toISOString();
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {
            authors: [],
            categories: [],
            tags: [],
            lastSeenAt: now,
            updatedAt: now
        };
    }
    return {
        authors: uniqueValues(value.authors, 500),
        categories: uniqueValues(value.categories, 500),
        tags: uniqueValues(value.tags, 500),
        lastSeenAt: normalizeIsoDate(value.lastSeenAt, now),
        updatedAt: normalizeIsoDate(value.updatedAt, now)
    };
};

const normalizeReaderState = (value) => {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const history = toArray(record.history)
        .map((entry) => normalizeActivityItem(entry))
        .filter(Boolean)
        .slice(0, HISTORY_LIMIT);
    const bookmarks = toArray(record.bookmarks)
        .map((entry) => normalizeBookmark(entry))
        .filter(Boolean)
        .slice(0, BOOKMARK_LIMIT);
    const follows = normalizeFollows(record.follows);
    const collections = toArray(record.collections)
        .map((entry) => normalizeCollection(entry))
        .filter(Boolean)
        .slice(0, COLLECTION_LIMIT);
    const dismissedNotifications = uniqueValues(record.dismissedNotifications, DISMISSED_LIMIT);
    return {
        history,
        bookmarks,
        follows,
        collections,
        dismissedNotifications,
        updatedAt: normalizeIsoDate(record.updatedAt, follows.updatedAt)
    };
};

const resolveActor = async (req) => {
    const claims = readSessionClaimsFromRequest(req);
    if (!claims?.userId) return null;
    const users = await readUsers();
    const actor = users.find((user) => user.id === claims.userId);
    if (!actor) return null;
    return {
        id: actor.id,
        role: actor.role === 'admin'
            ? 'admin'
            : (actor.role === 'moderator' ? 'moderator' : 'reader')
    };
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;
    json(res, 429, { error: 'Too many requests.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const getReaderStateRow = async (userId) => {
    const row = await listRows(TABLE_NAME, {
        filters: [{ op: 'eq', column: 'userId', value: userId }],
        single: true
    });
    if (!row || typeof row !== 'object') {
        return null;
    }
    return row;
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    const clientIp = getClientIp(req);

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: BODY_LIMIT_BYTES });
    } catch (error) {
        json(res, Number(error?.statusCode) || 400, {
            error: error?.message || 'Invalid JSON body.'
        });
        return;
    }

    const action = toTrimmedString(body.action || 'get').toLowerCase();
    if (!['get', 'save'].includes(action)) {
        json(res, 400, { error: 'Unsupported action.' });
        return;
    }

    if (action === 'get') {
        if (!applyRateLimit(res, `reader-state:get:${clientIp}`, READ_MAX_REQUESTS, READ_WINDOW_MS)) {
            return;
        }
    } else {
        if (!applyRateLimit(res, `reader-state:save:${clientIp}`, WRITE_MAX_REQUESTS, WRITE_WINDOW_MS)) {
            return;
        }
        if (!isTrustedOrigin(req)) {
            json(res, 403, { error: 'Cross-site request blocked.' });
            return;
        }
    }

    const actor = await resolveActor(req);
    if (!actor) {
        json(res, 401, { error: 'Login required.' });
        return;
    }

    try {
        const existingRow = await getReaderStateRow(actor.id);
        const existingState = normalizeReaderState(existingRow?.state || existingRow || {});

        if (action === 'get') {
            json(res, 200, { state: existingState });
            return;
        }

        const incomingState = normalizeReaderState(body.state || {});
        const nextState = {
            ...existingState,
            ...incomingState,
            follows: {
                ...existingState.follows,
                ...incomingState.follows,
                authors: uniqueValues([
                    ...(existingState.follows?.authors || []),
                    ...(incomingState.follows?.authors || [])
                ], 500),
                categories: uniqueValues([
                    ...(existingState.follows?.categories || []),
                    ...(incomingState.follows?.categories || [])
                ], 500),
                tags: uniqueValues([
                    ...(existingState.follows?.tags || []),
                    ...(incomingState.follows?.tags || [])
                ], 500),
                lastSeenAt: normalizeIsoDate(
                    incomingState?.follows?.lastSeenAt || existingState?.follows?.lastSeenAt
                ),
                updatedAt: normalizeIsoDate(
                    incomingState?.follows?.updatedAt || existingState?.follows?.updatedAt
                )
            },
            updatedAt: new Date().toISOString()
        };

        const row = {
            id: toTrimmedString(existingRow?.id) || actor.id,
            userId: actor.id,
            state: nextState,
            updatedAt: nextState.updatedAt
        };
        await upsertRows(TABLE_NAME, [row], 'id');
        json(res, 200, { state: nextState });
    } catch (error) {
        json(res, 500, {
            error: error instanceof Error ? error.message : 'Reader state save failed.'
        });
    }
}
