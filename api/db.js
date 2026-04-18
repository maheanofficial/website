import {
    deleteRows,
    insertRows,
    listRows,
    updateRows,
    upsertRows
} from './_table-store.js';
import { listPublicStoryRows } from './_public-story-rows.js';
import { readUsers, writeUsers } from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    isTrustedOrigin,
    json,
    readJsonBody
} from './_request-utils.js';
import { readSessionClaimsFromRequest } from './_auth-session.js';

const parseBodyLimitMb = (...values) => {
    for (const value of values) {
        const parsed = Number.parseInt(String(value || '').trim(), 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return 64;
};

const DB_BODY_LIMIT_BYTES = parseBodyLimitMb(
    process.env.DB_BODY_LIMIT_MB,
    process.env.CPANEL_DB_BODY_LIMIT_MB,
    process.env.APP_DB_BODY_LIMIT_MB
) * 1024 * 1024;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_REQUESTS = 400;
const WRITE_WINDOW_MS = 60_000;
const WRITE_MAX_REQUESTS = 160;

const WRITE_ACTIONS = new Set(['insert', 'upsert', 'update', 'delete']);
const ALLOWED_ACTIONS = new Set(['select', ...WRITE_ACTIONS]);
const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const BLOCKED_AUTHOR_NAME_KEYS = new Set(['team useless']);
const BLOCKED_AUTHOR_USERNAME_KEYS = new Set(['teamuseless']);
const DEFAULT_BLOCKED_STORY_SUBMITTER_IDS = ['bed0e197-08dc-4e4d-8ac4-b959692759c1'];
const STORY_PUBLIC_STATUSES = new Set(['published', 'completed', 'ongoing']);
const STORY_TABLE = 'stories';
const TABLE_ACCESS = new Map([
    ['stories', {
        publicRead: true,
        publicWrite: new Set(),
        // Moderators can submit/edit/delete their own non-public stories.
        // Ownership + status constraints are enforced in story-specific handlers below.
        moderatorWrite: true,
        moderatorDelete: true
    }],
    ['authors', {
        publicRead: true,
        publicWrite: new Set(),
        moderatorWrite: false,
        moderatorDelete: false
    }],
    ['categories', {
        publicRead: true,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: true
    }],
    ['activity_logs', {
        publicRead: false,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: false
    }],
    ['login_history', {
        publicRead: false,
        publicWrite: new Set(['insert']),
        moderatorWrite: true,
        moderatorDelete: false
    }],
    ['analytics_daily', {
        publicRead: false,
        publicWrite: new Set(['insert', 'upsert']),
        moderatorWrite: true,
        moderatorDelete: false
    }],
    ['trash', {
        publicRead: false,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: true
    }]
]);

const toString = (value) => String(value || '').trim();
const normalizeKey = (value) => toString(value).toLowerCase();
const parseCsvList = (...values) => {
    const out = [];
    values.forEach((value) => {
        String(value || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .forEach((entry) => out.push(entry));
    });
    return Array.from(new Set(out));
};

const BLOCKED_STORY_SUBMITTER_IDS = new Set(
    parseCsvList(
        DEFAULT_BLOCKED_STORY_SUBMITTER_IDS.join(','),
        process.env.BLOCKED_STORY_SUBMITTER_IDS,
        process.env.CPANEL_BLOCKED_STORY_SUBMITTER_IDS,
        process.env.APP_BLOCKED_STORY_SUBMITTER_IDS
    ).map(normalizeKey).filter(Boolean)
);

const BLOCKED_ACTOR_IDS = new Set(
    parseCsvList(
        process.env.BLOCKED_ACTOR_IDS,
        process.env.CPANEL_BLOCKED_ACTOR_IDS,
        process.env.APP_BLOCKED_ACTOR_IDS
    )
        .map(normalizeKey)
        .filter(Boolean)
);
BLOCKED_STORY_SUBMITTER_IDS.forEach((id) => BLOCKED_ACTOR_IDS.add(id));

let storyQuarantinePromise = null;
let storyQuarantineDone = false;

const isBlockedAuthorRow = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const record = value;
    const nameKey = normalizeKey(record.name);
    const usernameKey = normalizeKey(record.username);
    return BLOCKED_AUTHOR_NAME_KEYS.has(nameKey) || BLOCKED_AUTHOR_USERNAME_KEYS.has(usernameKey);
};

const filterBlockedAuthorRows = (value) => {
    if (!Array.isArray(value)) {
        return isBlockedAuthorRow(value) ? null : value;
    }
    return value.filter((entry) => !isBlockedAuthorRow(entry));
};

const getAuthorRowAliases = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }

    const aliases = [
        normalizeKey(value.id) ? `id:${normalizeKey(value.id)}` : '',
        normalizeKey(value.username) ? `username:${normalizeKey(value.username)}` : '',
        normalizeKey(value.name) ? `name:${normalizeKey(value.name)}` : ''
    ].filter(Boolean);

    return Array.from(new Set(aliases));
};

const getAuthorRowCompletenessScore = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return 0;
    }

    let score = 0;
    if (normalizeKey(value.name)) score += 2;
    if (normalizeKey(value.username)) score += 3;
    if (normalizeKey(value.bio)) score += 5;
    if (normalizeKey(value.avatar)) score += 4;
    if (Array.isArray(value.links) && value.links.length > 0) {
        score += Math.min(6, value.links.length * 2);
    }
    return score;
};

const mergeAuthorRows = (current, incoming) => {
    const currentScore = getAuthorRowCompletenessScore(current);
    const incomingScore = getAuthorRowCompletenessScore(incoming);
    const preferred = incomingScore > currentScore ? incoming : current;
    const fallback = preferred === current ? incoming : current;

    return {
        ...fallback,
        ...preferred,
        id: preferred.id || fallback.id,
        name: preferred.name || fallback.name,
        bio: preferred.bio || fallback.bio || null,
        avatar: preferred.avatar || fallback.avatar || null,
        username: preferred.username || fallback.username || null,
        links: Array.isArray(preferred.links) && preferred.links.length > 0
            ? preferred.links
            : (Array.isArray(fallback.links) ? fallback.links : [])
    };
};

const dedupeAuthorRows = (value) => {
    if (!Array.isArray(value)) {
        return isBlockedAuthorRow(value) ? null : value;
    }

    const aliasToCanonical = new Map();
    const canonicalToRow = new Map();

    value.forEach((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return;
        }
        if (isBlockedAuthorRow(entry)) {
            return;
        }

        const aliases = getAuthorRowAliases(entry);
        const matchedAlias = aliases.find((alias) => aliasToCanonical.has(alias));
        const matchedCanonicalKey = matchedAlias ? aliasToCanonical.get(matchedAlias) || '' : '';
        const canonicalKey = matchedCanonicalKey || aliases[0] || `name:${normalizeKey(entry.name)}`;
        const existing = matchedCanonicalKey ? canonicalToRow.get(canonicalKey) : null;
        const merged = existing ? mergeAuthorRows(existing, entry) : entry;
        const mergedAliases = getAuthorRowAliases(merged);
        const nextCanonicalKey = mergedAliases[0] || canonicalKey;

        if (nextCanonicalKey !== canonicalKey) {
            canonicalToRow.delete(canonicalKey);
        }

        canonicalToRow.set(nextCanonicalKey, merged);
        [...aliases, ...mergedAliases].forEach((alias) => {
            aliasToCanonical.set(alias, nextCanonicalKey);
        });
    });

    return Array.from(canonicalToRow.values());
};

const sanitizeJsonValue = (value, depth = 0) => {
    if (depth > 40) {
        return null;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeJsonValue(entry, depth + 1));
    }

    if (value && typeof value === 'object') {
        const out = {};
        Object.entries(value).forEach(([key, nested]) => {
            if (!key || BLOCKED_OBJECT_KEYS.has(key)) {
                return;
            }
            out[key] = sanitizeJsonValue(nested, depth + 1);
        });
        return out;
    }

    return value;
};

const normalizeFilters = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => ({
            op: toString(entry?.op).toLowerCase(),
            column: toString(entry?.column),
            value: sanitizeJsonValue(entry?.value)
        }))
        .filter((entry) => entry.op && entry.column);
};

const normalizeOrderBy = (value) => {
    if (!value || typeof value !== 'object') return null;
    const column = toString(value.column);
    if (!column) return null;
    return {
        column,
        ascending: Boolean(value.ascending)
    };
};

const maybeArray = (value) => (Array.isArray(value) ? value : [value]);

const toColumnList = (columns) =>
    String(columns || '*')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

const selectColumns = (rows, columns) => {
    if (columns === '*') {
        return rows;
    }
    const selectedColumns = toColumnList(columns);
    return rows.map((row) => {
        const out = {};
        selectedColumns.forEach((column) => {
            out[column] = row?.[column];
        });
        return out;
    });
};

const sanitizeRowsInput = (value) =>
    maybeArray(value)
        .map((entry) => sanitizeJsonValue(entry))
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));

const createApiError = (statusCode, code, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
};

const normalizeStoryStatus = (value) => normalizeKey(value);

const isStoryOwnedByActor = (storyRow, actorId) =>
    normalizeKey(storyRow?.submitted_by) === normalizeKey(actorId);

const toModeratorStoryStatus = (incomingStatus, existingStatus, hasExistingStory) => {
    const incoming = normalizeStoryStatus(incomingStatus);
    if (incoming === 'draft') {
        return !hasExistingStory || normalizeStoryStatus(existingStatus) === 'draft'
            ? 'draft'
            : 'pending';
    }
    return 'pending';
};

const sanitizeModeratorStoryRow = (value, actorId, existingStory = null) => {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
    const row = {
        ...source,
        submitted_by: actorId,
        is_featured: false
    };
    row.status = toModeratorStoryStatus(
        row.status,
        existingStory?.status,
        Boolean(existingStory)
    );
    return row;
};

const sanitizeModeratorStoryPatch = (value, actorId, existingStory) => {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
    const patch = { ...source };

    // Guard immutable ownership and primary key for moderator writes.
    delete patch.id;
    delete patch.submitted_by;

    patch.submitted_by = actorId;
    patch.is_featured = false;
    patch.status = toModeratorStoryStatus(
        patch.status,
        existingStory?.status,
        Boolean(existingStory)
    );

    return patch;
};

const getStoryRowsFromUnknown = (value) =>
    (Array.isArray(value) ? value : [])
        .filter((row) => row && typeof row === 'object' && !Array.isArray(row));

const shouldQuarantineStoryRow = (storyRow) => {
    if (!storyRow || typeof storyRow !== 'object' || Array.isArray(storyRow)) {
        return false;
    }

    const storyId = toString(storyRow.id);
    if (!storyId) return false;

    const submitterId = normalizeKey(storyRow.submitted_by);
    if (!submitterId) return false;

    return BLOCKED_STORY_SUBMITTER_IDS.has(submitterId);
};

const runStoryQuarantine = async () => {
    if (!BLOCKED_STORY_SUBMITTER_IDS.size) {
        return;
    }

    const rows = await listRows(STORY_TABLE, { columns: '*' });
    const storyRows = getStoryRowsFromUnknown(rows);
    const quarantined = storyRows.filter((row) => shouldQuarantineStoryRow(row));
    if (!quarantined.length) {
        return;
    }

    for (const row of quarantined) {
        const storyId = toString(row.id);
        if (!storyId) continue;
        await deleteRows(STORY_TABLE, [{ op: 'eq', column: 'id', value: storyId }]);
    }

    console.warn(`[security] quarantined ${quarantined.length} blocked stories.`);

    const users = await readUsers();
    const filteredUsers = (Array.isArray(users) ? users : [])
        .filter((user) => !BLOCKED_ACTOR_IDS.has(normalizeKey(user?.id)));
    if (filteredUsers.length !== users.length) {
        await writeUsers(filteredUsers);
        console.warn(`[security] removed ${users.length - filteredUsers.length} blocked user account(s).`);
    }
};

const maybeRunStoryQuarantine = async () => {
    if (storyQuarantineDone) {
        return;
    }

    if (!storyQuarantinePromise) {
        storyQuarantinePromise = runStoryQuarantine()
            .catch((error) => {
                console.warn('[security] story quarantine failed:', error?.message || error);
            })
            .finally(() => {
                storyQuarantineDone = true;
            });
    }

    await storyQuarantinePromise;
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const resolveActorFromSession = async (req) => {
    const claims = readSessionClaimsFromRequest(req);
    if (!claims?.userId) {
        return null;
    }

    const users = await readUsers();
    const actor = users.find((user) => user.id === claims.userId);
    if (!actor) {
        return null;
    }
    if (BLOCKED_ACTOR_IDS.has(normalizeKey(actor.id))) {
        return null;
    }

    return {
        id: actor.id,
        role: actor.role === 'admin'
            ? 'admin'
            : (actor.role === 'moderator' ? 'moderator' : 'reader')
    };
};

const assertAccess = async (req, action, table) => {
    const policy = TABLE_ACCESS.get(table);
    if (!policy) {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN_TABLE',
            message: 'Table is not allowed.'
        };
    }

    const isWrite = WRITE_ACTIONS.has(action);
    if (isWrite && !isTrustedOrigin(req)) {
        return {
            ok: false,
            statusCode: 403,
            code: 'CSRF_BLOCKED',
            message: 'Cross-site request blocked.'
        };
    }

    if (action === 'select') {
        const actor = await resolveActorFromSession(req);
        if (policy.publicRead) {
            if (actor?.role === 'admin' || actor?.role === 'moderator') {
                return { ok: true, actor };
            }
            return { ok: true, actor: null };
        }

        if (!actor) {
            return {
                ok: false,
                statusCode: 401,
                code: 'AUTH_REQUIRED',
                message: 'Authentication is required for this table.'
            };
        }
        if (actor.role === 'reader') {
            return {
                ok: false,
                statusCode: 403,
                code: 'FORBIDDEN',
                message: 'Only moderator or admin can read this table.'
            };
        }

        return { ok: true, actor };
    }

    if (policy.publicWrite.has(action)) {
        return { ok: true, actor: null };
    }

    const actor = await resolveActorFromSession(req);
    if (!actor) {
        return {
            ok: false,
            statusCode: 401,
            code: 'AUTH_REQUIRED',
            message: 'Authentication is required for write operations.'
        };
    }

    if (actor.role === 'admin') {
        return { ok: true, actor };
    }

    if (actor.role !== 'moderator') {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'This account can only read and comment.'
        };
    }

    if (!policy.moderatorWrite) {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Only admin can modify this table.'
        };
    }

    if (action === 'delete' && !policy.moderatorDelete) {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Only admin can delete records from this table.'
        };
    }

    return { ok: true, actor };
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
        return;
    }

    const clientIp = getClientIp(req);
    if (!applyRateLimit(res, `db:all:${clientIp}`, GLOBAL_MAX_REQUESTS, GLOBAL_WINDOW_MS)) {
        return;
    }

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: DB_BODY_LIMIT_BYTES });
    } catch (error) {
        json(res, Number(error?.statusCode) || 400, {
            error: {
                code: error?.code || 'INVALID_JSON',
                message: error?.message || 'Invalid JSON body.'
            }
        });
        return;
    }

    const table = toString(body.table).toLowerCase();
    const action = toString(body.action || 'select').toLowerCase();
    const filters = normalizeFilters(body.filters);
    const orderBy = normalizeOrderBy(body.orderBy);
    const columns = toString(body.columns || '*');
    const single = Boolean(body.single);

    if (!table) {
        json(res, 400, { error: { code: 'INVALID_TABLE', message: 'table is required.' } });
        return;
    }
    if (!ALLOWED_ACTIONS.has(action)) {
        json(res, 400, { error: { code: 'INVALID_ACTION', message: `Unsupported action: ${action}` } });
        return;
    }

    if (
        WRITE_ACTIONS.has(action)
        && !applyRateLimit(res, `db:write:${clientIp}`, WRITE_MAX_REQUESTS, WRITE_WINDOW_MS)
    ) {
        return;
    }

    const accessCheck = await assertAccess(req, action, table);
    if (!accessCheck.ok) {
        json(res, accessCheck.statusCode, {
            error: {
                code: accessCheck.code,
                message: accessCheck.message
            },
            data: null
        });
        return;
    }

    if (table === STORY_TABLE) {
        await maybeRunStoryQuarantine();
    }

    try {
        if (action === 'select') {
            if (table === 'stories' && !accessCheck.actor) {
                const visibleRows = await listPublicStoryRows({ filters, orderBy });
                const selectedRows = selectColumns(visibleRows, columns);
                const data = single ? (selectedRows[0] || null) : selectedRows;
                json(res, 200, { data, error: null });
                return;
            }

            const data = await listRows(table, { filters, orderBy, columns, single });
            const safeData = table === 'authors'
                ? dedupeAuthorRows(filterBlockedAuthorRows(data))
                : data;
            json(res, 200, { data: safeData, error: null });
            return;
        }

        if (action === 'insert') {
            const values = sanitizeRowsInput(body.values || []);
            if (table === STORY_TABLE && accessCheck.actor?.role === 'moderator') {
                const moderatedValues = values.map((entry) =>
                    sanitizeModeratorStoryRow(entry, accessCheck.actor.id, null)
                );
                const inserted = await insertRows(table, moderatedValues);
                json(res, 200, { data: selectColumns(inserted, columns), error: null });
                return;
            }
            if (table === 'authors' && values.some((entry) => isBlockedAuthorRow(entry))) {
                json(res, 400, {
                    error: {
                        code: 'INVALID_AUTHOR',
                        message: 'Blocked author profile cannot be created.'
                    },
                    data: null
                });
                return;
            }
            const inserted = await insertRows(table, values);
            json(res, 200, { data: selectColumns(inserted, columns), error: null });
            return;
        }

        if (action === 'upsert') {
            const values = sanitizeRowsInput(body.values || []);
            if (table === STORY_TABLE && accessCheck.actor?.role === 'moderator') {
                const existingRows = await listRows(STORY_TABLE, { columns: '*' });
                const existingById = new Map(
                    getStoryRowsFromUnknown(existingRows).map((row) => [toString(row.id), row])
                );

                const moderatedValues = values.map((entry) => {
                    const storyId = toString(entry?.id);
                    const existingStory = storyId ? existingById.get(storyId) : null;
                    if (existingStory && !isStoryOwnedByActor(existingStory, accessCheck.actor.id)) {
                        throw createApiError(
                            403,
                            'FORBIDDEN_STORY_OWNER',
                            'You can only edit your own story.'
                        );
                    }
                    return sanitizeModeratorStoryRow(entry, accessCheck.actor.id, existingStory || null);
                });

                const changed = await upsertRows(table, moderatedValues, 'id');
                json(res, 200, { data: changed, error: null });
                return;
            }
            if (table === 'authors' && values.some((entry) => isBlockedAuthorRow(entry))) {
                json(res, 400, {
                    error: {
                        code: 'INVALID_AUTHOR',
                        message: 'Blocked author profile cannot be saved.'
                    },
                    data: null
                });
                return;
            }
            const changed = await upsertRows(table, values, body.onConflict || 'id');
            json(res, 200, { data: changed, error: null });
            return;
        }

        if (action === 'update') {
            const patchValue = sanitizeJsonValue(body.values);
            const patch = patchValue && typeof patchValue === 'object' && !Array.isArray(patchValue)
                ? patchValue
                : {};
            if (table === STORY_TABLE && accessCheck.actor?.role === 'moderator') {
                if (!filters.length) {
                    throw createApiError(
                        400,
                        'INVALID_FILTERS',
                        'Story update requires a specific filter.'
                    );
                }

                const targetRows = await listRows(STORY_TABLE, { filters, columns: '*' });
                const stories = getStoryRowsFromUnknown(targetRows);
                if (stories.length > 1) {
                    throw createApiError(
                        400,
                        'BULK_UPDATE_NOT_ALLOWED',
                        'Bulk story update is not allowed for moderator.'
                    );
                }
                if (!stories.length) {
                    json(res, 200, { data: [], error: null });
                    return;
                }

                const targetStory = stories[0];
                if (!isStoryOwnedByActor(targetStory, accessCheck.actor.id)) {
                    throw createApiError(
                        403,
                        'FORBIDDEN_STORY_OWNER',
                        'You can only edit your own story.'
                    );
                }

                const moderatedPatch = sanitizeModeratorStoryPatch(
                    patch,
                    accessCheck.actor.id,
                    targetStory
                );
                const scopedFilters = [
                    ...filters,
                    { op: 'eq', column: 'submitted_by', value: accessCheck.actor.id }
                ];
                const updated = await updateRows(table, moderatedPatch, scopedFilters);
                json(res, 200, { data: updated, error: null });
                return;
            }
            if (table === 'authors' && isBlockedAuthorRow(patch)) {
                json(res, 400, {
                    error: {
                        code: 'INVALID_AUTHOR',
                        message: 'Blocked author profile cannot be updated.'
                    },
                    data: null
                });
                return;
            }
            const updated = await updateRows(table, patch, filters);
            json(res, 200, { data: updated, error: null });
            return;
        }

        if (table === STORY_TABLE && accessCheck.actor?.role === 'moderator') {
            if (!filters.length) {
                throw createApiError(
                    400,
                    'INVALID_FILTERS',
                    'Story delete requires a specific filter.'
                );
            }

            const targetRows = await listRows(STORY_TABLE, { filters, columns: '*' });
            const stories = getStoryRowsFromUnknown(targetRows);
            if (stories.length > 1) {
                throw createApiError(
                    400,
                    'BULK_DELETE_NOT_ALLOWED',
                    'Bulk story delete is not allowed for moderator.'
                );
            }
            if (!stories.length) {
                json(res, 200, { data: [], error: null });
                return;
            }

            const targetStory = stories[0];
            if (!isStoryOwnedByActor(targetStory, accessCheck.actor.id)) {
                throw createApiError(
                    403,
                    'FORBIDDEN_STORY_OWNER',
                    'You can only delete your own story.'
                );
            }

            const storyStatus = normalizeStoryStatus(targetStory.status);
            if (STORY_PUBLIC_STATUSES.has(storyStatus)) {
                throw createApiError(
                    403,
                    'FORBIDDEN_DELETE_PUBLISHED',
                    'Published story can only be deleted by admin.'
                );
            }

            const scopedFilters = [
                ...filters,
                { op: 'eq', column: 'submitted_by', value: accessCheck.actor.id }
            ];
            const deleted = await deleteRows(table, scopedFilters);
            json(res, 200, { data: selectColumns(deleted, columns), error: null });
            return;
        }

        const deleted = await deleteRows(table, filters);
        json(res, 200, { data: selectColumns(deleted, columns), error: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected DB error.';
        const statusCode = Number(error?.statusCode) || 500;
        const code = typeof error?.code === 'string' ? error.code : 'DB_ERROR';
        json(res, statusCode, { error: { code, message }, data: null });
    }
}
