import { buildServerAuthHeaders } from './serverAuth';
import {
    getReaderBookmarks,
    getReaderHistory,
    replaceReaderBookmarks,
    replaceReaderHistory,
    type ReaderActivityItem,
    type ReaderBookmark
} from './readerExperience';
import type { Story } from './storyManager';
import { normalizeCategoryFilterList } from './storyFilters';

export type ReaderFollowState = {
    authors: string[];
    categories: string[];
    tags: string[];
    lastSeenAt: string;
    updatedAt: string;
};

export type ReaderCollection = {
    id: string;
    name: string;
    storyIds: string[];
    createdAt: string;
    updatedAt: string;
};

export type ReaderNotification = {
    id: string;
    storyId: string;
    storyTitle: string;
    storyPath: string;
    storyDate: string;
    reason: 'author' | 'category' | 'tag';
    coverImage?: string;
};

export type ReaderCloudState = {
    history: ReaderActivityItem[];
    bookmarks: ReaderBookmark[];
    follows: ReaderFollowState;
    collections: ReaderCollection[];
    dismissedNotifications: string[];
    updatedAt: string;
};

const READER_FOLLOWS_KEY_PREFIX = 'mahean_reader_follows_v1:';
const READER_COLLECTIONS_KEY_PREFIX = 'mahean_reader_collections_v1:';
const READER_DISMISSED_NOTIFICATIONS_KEY_PREFIX = 'mahean_reader_dismissed_notifications_v1:';
const READER_COLLECTION_LIMIT = 20;
const READER_COLLECTION_ITEM_LIMIT = 200;
const READER_DISMISSED_LIMIT = 500;
const CLOUD_SYNC_DEBOUNCE_MS = 1200;

const syncTimers = new Map<string, number>();

const canUseStorage = () => typeof window !== 'undefined';

const normalizeUserId = (value: string) => String(value || '').trim();
const normalizeToken = (value: string) => String(value || '').trim().toLowerCase();
const normalizeDisplayValue = (value: string) => String(value || '').trim();

const toArray = (value: unknown) => (Array.isArray(value) ? value : []);

const uniqueValues = (values: string[], limit = 500) => {
    const seen = new Set<string>();
    const out: string[] = [];
    values.forEach((entry) => {
        const normalized = normalizeDisplayValue(entry);
        const key = normalizeToken(normalized);
        if (!normalized || !key || seen.has(key)) return;
        seen.add(key);
        out.push(normalized);
    });
    return out.slice(0, limit);
};

const safeJsonParse = <T>(value: string | null): T | null => {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const getScopedKey = (prefix: string, userId: string) => {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return '';
    return `${prefix}${normalizedUserId}`;
};

const readScopedValue = <T>(prefix: string, userId: string): T | null => {
    if (!canUseStorage()) return null;
    const key = getScopedKey(prefix, userId);
    if (!key) return null;
    return safeJsonParse<T>(localStorage.getItem(key));
};

const writeScopedValue = (prefix: string, userId: string, value: unknown) => {
    if (!canUseStorage()) return;
    const key = getScopedKey(prefix, userId);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(value));
};

const mergeByStoryId = <T extends { storyId: string }>(
    primary: T[],
    secondary: T[],
    dateResolver: (entry: T) => number
) => {
    const map = new Map<string, T>();
    [...primary, ...secondary].forEach((entry) => {
        const storyId = normalizeUserId(entry.storyId);
        if (!storyId) return;
        const existing = map.get(storyId);
        if (!existing) {
            map.set(storyId, entry);
            return;
        }
        map.set(storyId, dateResolver(entry) >= dateResolver(existing) ? entry : existing);
    });
    return Array.from(map.values());
};

const normalizeFollowState = (value: unknown): ReaderFollowState => {
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

    const record = value as Record<string, unknown>;
    return {
        authors: uniqueValues(toArray(record.authors).map((entry) => String(entry || '')), 500),
        categories: uniqueValues(toArray(record.categories).map((entry) => String(entry || '')), 500),
        tags: uniqueValues(toArray(record.tags).map((entry) => String(entry || '')), 500),
        lastSeenAt: normalizeDisplayValue(String(record.lastSeenAt || '')) || now,
        updatedAt: normalizeDisplayValue(String(record.updatedAt || '')) || now
    };
};

const normalizeCollection = (value: unknown): ReaderCollection | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const id = normalizeDisplayValue(String(record.id || ''));
    const name = normalizeDisplayValue(String(record.name || ''));
    if (!id || !name) return null;
    const createdAt = normalizeDisplayValue(String(record.createdAt || '')) || new Date().toISOString();
    const updatedAt = normalizeDisplayValue(String(record.updatedAt || '')) || createdAt;
    const storyIds = uniqueValues(toArray(record.storyIds).map((entry) => String(entry || '')), READER_COLLECTION_ITEM_LIMIT);
    return {
        id,
        name,
        storyIds,
        createdAt,
        updatedAt
    };
};

const normalizeCollections = (value: unknown) => {
    const collections = toArray(value)
        .map((entry) => normalizeCollection(entry))
        .filter((entry): entry is ReaderCollection => Boolean(entry));
    const seen = new Set<string>();
    return collections
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .filter((collection) => {
            const key = normalizeToken(collection.id);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, READER_COLLECTION_LIMIT);
};

const normalizeDismissedNotifications = (value: unknown) =>
    uniqueValues(toArray(value).map((entry) => String(entry || '')), READER_DISMISSED_LIMIT);

const normalizeCloudState = (value: unknown): ReaderCloudState => {
    const now = new Date().toISOString();
    const record = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const history = toArray(record.history) as ReaderActivityItem[];
    const bookmarks = toArray(record.bookmarks) as ReaderBookmark[];
    const follows = normalizeFollowState(record.follows);
    const collections = normalizeCollections(record.collections);
    const dismissedNotifications = normalizeDismissedNotifications(record.dismissedNotifications);

    return {
        history: mergeByStoryId(history, [], (entry) => new Date(String(entry.updatedAt || 0)).getTime()),
        bookmarks: mergeByStoryId(bookmarks, [], (entry) => new Date(String(entry.savedAt || entry.updatedAt || 0)).getTime()),
        follows,
        collections,
        dismissedNotifications,
        updatedAt: normalizeDisplayValue(String(record.updatedAt || '')) || follows.updatedAt || now
    };
};

const getStoryTimestamp = (story: Story) => {
    const updated = Date.parse(String(story.updatedAt || ''));
    if (Number.isFinite(updated)) return updated;
    const created = Date.parse(String(story.date || ''));
    if (Number.isFinite(created)) return created;
    return 0;
};

const getStoryPath = (story: Story) => `/stories/${story.slug || story.id}`;

const getLocalCloudState = (userId: string): ReaderCloudState => {
    const follows = normalizeFollowState(readScopedValue(READER_FOLLOWS_KEY_PREFIX, userId));
    const collections = normalizeCollections(readScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId));
    const dismissedNotifications = normalizeDismissedNotifications(
        readScopedValue(READER_DISMISSED_NOTIFICATIONS_KEY_PREFIX, userId)
    );
    return {
        history: getReaderHistory(userId),
        bookmarks: getReaderBookmarks(userId),
        follows,
        collections,
        dismissedNotifications,
        updatedAt: follows.updatedAt || new Date().toISOString()
    };
};

const saveLocalCloudState = (userId: string, state: ReaderCloudState) => {
    replaceReaderHistory(userId, state.history);
    replaceReaderBookmarks(userId, state.bookmarks);
    writeScopedValue(READER_FOLLOWS_KEY_PREFIX, userId, state.follows);
    writeScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId, state.collections);
    writeScopedValue(READER_DISMISSED_NOTIFICATIONS_KEY_PREFIX, userId, state.dismissedNotifications);
};

const mergeCloudState = (localState: ReaderCloudState, remoteState: ReaderCloudState): ReaderCloudState => {
    const follows: ReaderFollowState = {
        authors: uniqueValues([...localState.follows.authors, ...remoteState.follows.authors], 500),
        categories: uniqueValues([...localState.follows.categories, ...remoteState.follows.categories], 500),
        tags: uniqueValues([...localState.follows.tags, ...remoteState.follows.tags], 500),
        lastSeenAt: new Date(localState.follows.lastSeenAt).getTime() >= new Date(remoteState.follows.lastSeenAt).getTime()
            ? localState.follows.lastSeenAt
            : remoteState.follows.lastSeenAt,
        updatedAt: new Date(localState.follows.updatedAt).getTime() >= new Date(remoteState.follows.updatedAt).getTime()
            ? localState.follows.updatedAt
            : remoteState.follows.updatedAt
    };

    const mergedCollections = normalizeCollections([...localState.collections, ...remoteState.collections]);
    const mergedHistory = mergeByStoryId(
        localState.history,
        remoteState.history,
        (entry) => new Date(String(entry.updatedAt || 0)).getTime()
    );
    const mergedBookmarks = mergeByStoryId(
        localState.bookmarks,
        remoteState.bookmarks,
        (entry) => new Date(String(entry.savedAt || entry.updatedAt || 0)).getTime()
    );

    return {
        history: mergedHistory,
        bookmarks: mergedBookmarks,
        follows,
        collections: mergedCollections,
        dismissedNotifications: uniqueValues(
            [...localState.dismissedNotifications, ...remoteState.dismissedNotifications],
            READER_DISMISSED_LIMIT
        ),
        updatedAt: new Date(localState.updatedAt).getTime() >= new Date(remoteState.updatedAt).getTime()
            ? localState.updatedAt
            : remoteState.updatedAt
    };
};

const postReaderState = async (action: string, payload?: Record<string, unknown>) => {
    const response = await fetch('/api/reader-state', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action,
            ...(payload || {})
        })
    });
    const json = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
        const errorMessage = typeof json?.error === 'string'
            ? json.error
            : 'Reader sync failed.';
        throw new Error(errorMessage);
    }
    return json as Record<string, unknown>;
};

export const getReaderFollowState = (userId: string) =>
    normalizeFollowState(readScopedValue(READER_FOLLOWS_KEY_PREFIX, userId));

export const isReaderFollowingAuthor = (userId: string, authorName?: string) => {
    const token = normalizeToken(String(authorName || ''));
    if (!token) return false;
    return getReaderFollowState(userId).authors.some((entry) => normalizeToken(entry) === token);
};

export const isReaderFollowingCategory = (userId: string, categoryName?: string) => {
    const token = normalizeToken(String(categoryName || ''));
    if (!token) return false;
    return getReaderFollowState(userId).categories.some((entry) => normalizeToken(entry) === token);
};

const writeFollowState = (userId: string, updater: (state: ReaderFollowState) => ReaderFollowState) => {
    const current = getReaderFollowState(userId);
    const next = updater(current);
    writeScopedValue(READER_FOLLOWS_KEY_PREFIX, userId, {
        ...next,
        updatedAt: new Date().toISOString()
    });
    queueReaderStateSync(userId);
    return getReaderFollowState(userId);
};

export const toggleReaderAuthorFollow = (userId: string, authorName: string) => {
    const normalized = normalizeDisplayValue(authorName);
    if (!normalized) return getReaderFollowState(userId);
    return writeFollowState(userId, (state) => {
        const exists = state.authors.some((entry) => normalizeToken(entry) === normalizeToken(normalized));
        return {
            ...state,
            authors: exists
                ? state.authors.filter((entry) => normalizeToken(entry) !== normalizeToken(normalized))
                : uniqueValues([normalized, ...state.authors], 500)
        };
    });
};

export const toggleReaderCategoryFollow = (userId: string, categoryName: string) => {
    const normalized = normalizeDisplayValue(categoryName);
    if (!normalized) return getReaderFollowState(userId);
    return writeFollowState(userId, (state) => {
        const exists = state.categories.some((entry) => normalizeToken(entry) === normalizeToken(normalized));
        return {
            ...state,
            categories: exists
                ? state.categories.filter((entry) => normalizeToken(entry) !== normalizeToken(normalized))
                : uniqueValues([normalized, ...state.categories], 500)
        };
    });
};

export const markReaderNotificationsSeen = (userId: string) => {
    writeFollowState(userId, (state) => ({
        ...state,
        lastSeenAt: new Date().toISOString()
    }));
};

export const dismissReaderNotification = (userId: string, storyId: string) => {
    const normalizedStoryId = normalizeDisplayValue(storyId);
    if (!normalizedStoryId) return;
    const current = normalizeDismissedNotifications(
        readScopedValue(READER_DISMISSED_NOTIFICATIONS_KEY_PREFIX, userId)
    );
    writeScopedValue(
        READER_DISMISSED_NOTIFICATIONS_KEY_PREFIX,
        userId,
        uniqueValues([normalizedStoryId, ...current], READER_DISMISSED_LIMIT)
    );
    queueReaderStateSync(userId);
};

export const getReaderCollections = (userId: string) =>
    normalizeCollections(readScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId));

export const createReaderCollection = (userId: string, name: string) => {
    const normalizedName = normalizeDisplayValue(name);
    if (!normalizedName) return getReaderCollections(userId);
    const now = new Date().toISOString();
    const collection: ReaderCollection = {
        id: `collection-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: normalizedName,
        storyIds: [],
        createdAt: now,
        updatedAt: now
    };
    const next = normalizeCollections([collection, ...getReaderCollections(userId)]);
    writeScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId, next);
    queueReaderStateSync(userId);
    return next;
};

export const renameReaderCollection = (userId: string, collectionId: string, name: string) => {
    const normalizedName = normalizeDisplayValue(name);
    if (!normalizedName) return getReaderCollections(userId);
    const now = new Date().toISOString();
    const next = normalizeCollections(
        getReaderCollections(userId).map((collection) =>
            collection.id === collectionId
                ? { ...collection, name: normalizedName, updatedAt: now }
                : collection
        )
    );
    writeScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId, next);
    queueReaderStateSync(userId);
    return next;
};

export const deleteReaderCollection = (userId: string, collectionId: string) => {
    const next = getReaderCollections(userId).filter((collection) => collection.id !== collectionId);
    writeScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId, next);
    queueReaderStateSync(userId);
    return next;
};

export const toggleStoryInReaderCollection = (userId: string, collectionId: string, storyId: string) => {
    const normalizedStoryId = normalizeDisplayValue(storyId);
    if (!normalizedStoryId) return getReaderCollections(userId);
    const now = new Date().toISOString();
    const next = normalizeCollections(
        getReaderCollections(userId).map((collection) => {
            if (collection.id !== collectionId) return collection;
            const exists = collection.storyIds.some((entry) => normalizeToken(entry) === normalizeToken(normalizedStoryId));
            return {
                ...collection,
                storyIds: exists
                    ? collection.storyIds.filter((entry) => normalizeToken(entry) !== normalizeToken(normalizedStoryId))
                    : uniqueValues([normalizedStoryId, ...collection.storyIds], READER_COLLECTION_ITEM_LIMIT),
                updatedAt: now
            };
        })
    );
    writeScopedValue(READER_COLLECTIONS_KEY_PREFIX, userId, next);
    queueReaderStateSync(userId);
    return next;
};

export const getReaderCollectionMembership = (userId: string, storyId: string) => {
    const normalizedStoryId = normalizeToken(storyId);
    if (!normalizedStoryId) return [];
    return getReaderCollections(userId).filter((collection) =>
        collection.storyIds.some((entry) => normalizeToken(entry) === normalizedStoryId)
    );
};

export const buildReaderNotifications = (userId: string, stories: Story[]) => {
    const follows = getReaderFollowState(userId);
    const followedAuthors = new Set(follows.authors.map((entry) => normalizeToken(entry)).filter(Boolean));
    const followedCategories = new Set(follows.categories.map((entry) => normalizeToken(entry)).filter(Boolean));
    const followedTags = new Set(follows.tags.map((entry) => normalizeToken(entry)).filter(Boolean));
    if (!followedAuthors.size && !followedCategories.size && !followedTags.size) {
        return [] as ReaderNotification[];
    }

    const lastSeenAt = new Date(follows.lastSeenAt || 0).getTime();
    const dismissed = new Set(
        normalizeDismissedNotifications(readScopedValue(READER_DISMISSED_NOTIFICATIONS_KEY_PREFIX, userId))
            .map((entry) => normalizeToken(entry))
    );

    return [...stories]
        .sort((left, right) => getStoryTimestamp(right) - getStoryTimestamp(left))
        .filter((story) => {
            const storyId = normalizeToken(String(story.id || ''));
            if (!storyId || dismissed.has(storyId)) return false;
            const storyTime = getStoryTimestamp(story);
            if (lastSeenAt && storyTime <= lastSeenAt) return false;
            return true;
        })
        .map((story) => {
            const authorToken = normalizeToken(story.author || '');
            const categoryTokens = normalizeCategoryFilterList(story.categories, story.category)
                .map((entry) => normalizeToken(entry))
                .filter(Boolean);
            const tagTokens = (story.tags || []).map((entry) => normalizeToken(entry)).filter(Boolean);

            let reason: ReaderNotification['reason'] | null = null;
            if (authorToken && followedAuthors.has(authorToken)) {
                reason = 'author';
            } else if (categoryTokens.some((entry) => followedCategories.has(entry))) {
                reason = 'category';
            } else if (tagTokens.some((entry) => followedTags.has(entry))) {
                reason = 'tag';
            }
            if (!reason) return null;
            return {
                id: `notif-${story.id}-${reason}`,
                storyId: String(story.id || ''),
                storyTitle: story.title,
                storyPath: getStoryPath(story),
                storyDate: story.date || story.updatedAt || new Date().toISOString(),
                reason,
                coverImage: story.cover_image || story.image || undefined
            } as ReaderNotification;
        })
        .filter((entry): entry is ReaderNotification => Boolean(entry))
        .slice(0, 20);
};

export const hydrateReaderStateFromCloud = async (userId: string) => {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    const localState = getLocalCloudState(normalizedUserId);
    try {
        const payload = await postReaderState('get');
        const remoteState = normalizeCloudState(payload?.state);
        const merged = mergeCloudState(localState, remoteState);
        saveLocalCloudState(normalizedUserId, merged);
        return merged;
    } catch {
        return localState;
    }
};

export const syncReaderStateToCloud = async (userId: string) => {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return;
    const localState = getLocalCloudState(normalizedUserId);
    await postReaderState('save', {
        state: localState
    });
};

export const queueReaderStateSync = (userId: string) => {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId || !canUseStorage()) return;

    const existingTimer = syncTimers.get(normalizedUserId);
    if (existingTimer) {
        window.clearTimeout(existingTimer);
    }

    const timerId = window.setTimeout(() => {
        syncTimers.delete(normalizedUserId);
        void syncReaderStateToCloud(normalizedUserId).catch(() => undefined);
    }, CLOUD_SYNC_DEBOUNCE_MS);

    syncTimers.set(normalizedUserId, timerId);
};
