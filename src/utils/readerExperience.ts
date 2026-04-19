export type ReaderFontScale = 'compact' | 'comfortable' | 'large';
export type ReaderTheme = 'dark' | 'sepia' | 'paper' | 'night';
export type ReaderWidth = 'narrow' | 'standard' | 'wide';

export type ReaderPreferences = {
    fontScale: ReaderFontScale;
    theme: ReaderTheme;
    width: ReaderWidth;
};

export type ReaderSession = {
    storyId: string;
    storySlug?: string;
    storyTitle: string;
    partIndex: number;
    partLabel: string;
    partSegment: string;
    path: string;
    progress: number;
    totalParts: number;
    coverImage?: string;
    updatedAt: string;
};

export type ReaderActivityItem = {
    storyId: string;
    storySlug?: string;
    storyTitle: string;
    path: string;
    partLabel: string;
    progress: number;
    totalParts: number;
    coverImage?: string;
    updatedAt: string;
};

export type ReaderBookmark = ReaderActivityItem & {
    savedAt: string;
};

const READER_SESSION_KEY = 'mahean_reader_session_v1';
const READER_PREFERENCES_KEY = 'mahean_reader_preferences_v1';
const READER_HISTORY_KEY_PREFIX = 'mahean_reader_history_v1:';
const READER_BOOKMARKS_KEY_PREFIX = 'mahean_reader_bookmarks_v1:';
const READER_HISTORY_LIMIT = 12;
const READER_BOOKMARK_LIMIT = 24;

const DEFAULT_PREFERENCES: ReaderPreferences = {
    fontScale: 'comfortable',
    theme: 'dark',
    width: 'standard'
};

const canUseStorage = () => typeof window !== 'undefined';

const safeJsonParse = <T>(value: string | null): T | null => {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const clampProgress = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
};

const normalizeStorageId = (value: string) => String(value || '').trim();

const getScopedKey = (prefix: string, userId: string) => {
    const normalizedUserId = normalizeStorageId(userId);
    if (!normalizedUserId) return '';
    return `${prefix}${normalizedUserId}`;
};

const normalizeActivityItem = (value: Partial<ReaderActivityItem> | null | undefined): ReaderActivityItem | null => {
    if (!value) return null;

    const storyId = normalizeStorageId(value.storyId || '');
    const storyTitle = String(value.storyTitle || '').trim();
    const path = String(value.path || '').trim();
    const partLabel = String(value.partLabel || '').trim();

    if (!storyId || !storyTitle || !path || !partLabel) {
        return null;
    }

    return {
        storyId,
        storySlug: String(value.storySlug || '').trim() || undefined,
        storyTitle,
        path,
        partLabel,
        progress: clampProgress(Number(value.progress)),
        totalParts: Math.max(1, Number(value.totalParts) || 1),
        coverImage: String(value.coverImage || '').trim() || undefined,
        updatedAt: String(value.updatedAt || '').trim() || new Date(0).toISOString()
    };
};

const normalizeBookmark = (value: Partial<ReaderBookmark> | null | undefined): ReaderBookmark | null => {
    const activity = normalizeActivityItem(value);
    if (!activity) return null;

    return {
        ...activity,
        savedAt: String(value?.savedAt || '').trim() || activity.updatedAt || new Date(0).toISOString()
    };
};

const readScopedList = <T>(
    prefix: string,
    userId: string,
    normalizer: (value: Partial<T> | null | undefined) => T | null
) => {
    if (!canUseStorage()) return [] as T[];

    const key = getScopedKey(prefix, userId);
    if (!key) return [] as T[];

    const parsed = safeJsonParse<Array<Partial<T>>>(localStorage.getItem(key));
    return (Array.isArray(parsed) ? parsed : [])
        .map((entry) => normalizer(entry))
        .filter((entry): entry is T => Boolean(entry));
};

const writeScopedList = (prefix: string, userId: string, value: unknown[]) => {
    if (!canUseStorage()) return;

    const key = getScopedKey(prefix, userId);
    if (!key) return;

    localStorage.setItem(key, JSON.stringify(value));
};

export const getReaderPreferences = (): ReaderPreferences => {
    if (!canUseStorage()) {
        return DEFAULT_PREFERENCES;
    }

    const parsed = safeJsonParse<Partial<ReaderPreferences>>(localStorage.getItem(READER_PREFERENCES_KEY));
    const fontScale = parsed?.fontScale;
    const theme = parsed?.theme;
    const width = parsed?.width;

    return {
        fontScale: fontScale === 'compact' || fontScale === 'large' || fontScale === 'comfortable'
            ? fontScale
            : DEFAULT_PREFERENCES.fontScale,
        theme: theme === 'sepia' || theme === 'paper' || theme === 'night' || theme === 'dark'
            ? theme
            : DEFAULT_PREFERENCES.theme,
        width: width === 'narrow' || width === 'wide' || width === 'standard'
            ? width
            : DEFAULT_PREFERENCES.width
    };
};

export const saveReaderPreferences = (preferences: ReaderPreferences) => {
    if (!canUseStorage()) return;
    localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify({
        fontScale: preferences.fontScale,
        theme: preferences.theme,
        width: preferences.width
    }));
};

export const getReaderSession = (): ReaderSession | null => {
    if (!canUseStorage()) return null;

    const parsed = safeJsonParse<Partial<ReaderSession>>(localStorage.getItem(READER_SESSION_KEY));
    if (!parsed) return null;

    const storyId = String(parsed.storyId || '').trim();
    const storyTitle = String(parsed.storyTitle || '').trim();
    const partLabel = String(parsed.partLabel || '').trim();
    const partSegment = String(parsed.partSegment || '').trim();
    const path = String(parsed.path || '').trim();
    const totalParts = Math.max(1, Number.parseInt(String(parsed.totalParts || '1'), 10) || 1);

    if (!storyId || !storyTitle || !partLabel || !partSegment || !path) {
        return null;
    }

    return {
        storyId,
        storySlug: String(parsed.storySlug || '').trim() || undefined,
        storyTitle,
        partIndex: Math.max(0, Number.parseInt(String(parsed.partIndex || '0'), 10) || 0),
        partLabel,
        partSegment,
        path,
        progress: clampProgress(Number(parsed.progress)),
        totalParts,
        coverImage: String(parsed.coverImage || '').trim() || undefined,
        updatedAt: String(parsed.updatedAt || '').trim() || new Date(0).toISOString()
    };
};

export const saveReaderSession = (session: ReaderSession) => {
    if (!canUseStorage()) return;

    const payload: ReaderSession = {
        ...session,
        storyId: String(session.storyId || '').trim(),
        storySlug: String(session.storySlug || '').trim() || undefined,
        storyTitle: String(session.storyTitle || '').trim(),
        partLabel: String(session.partLabel || '').trim(),
        partSegment: String(session.partSegment || '').trim(),
        path: String(session.path || '').trim(),
        progress: clampProgress(session.progress),
        totalParts: Math.max(1, Number(session.totalParts) || 1),
        updatedAt: session.updatedAt || new Date().toISOString()
    };

    if (!payload.storyId || !payload.storyTitle || !payload.partLabel || !payload.partSegment || !payload.path) {
        return;
    }

    localStorage.setItem(READER_SESSION_KEY, JSON.stringify(payload));
};

export const getReaderHistory = (userId: string) =>
    readScopedList(READER_HISTORY_KEY_PREFIX, userId, normalizeActivityItem);

const dedupeHistoryItems = (entries: ReaderActivityItem[]) => {
    const seen = new Set<string>();
    const ordered = [...entries]
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
        .filter((entry) => {
            if (!entry.storyId || seen.has(entry.storyId)) return false;
            seen.add(entry.storyId);
            return true;
        });
    return ordered.slice(0, READER_HISTORY_LIMIT);
};

const dedupeBookmarkItems = (entries: ReaderBookmark[]) => {
    const seen = new Set<string>();
    const ordered = [...entries]
        .sort((left, right) => new Date(right.savedAt || right.updatedAt || 0).getTime() - new Date(left.savedAt || left.updatedAt || 0).getTime())
        .filter((entry) => {
            if (!entry.storyId || seen.has(entry.storyId)) return false;
            seen.add(entry.storyId);
            return true;
        });
    return ordered.slice(0, READER_BOOKMARK_LIMIT);
};

export const replaceReaderHistory = (userId: string, entries: ReaderActivityItem[]) => {
    const normalized = (Array.isArray(entries) ? entries : [])
        .map((entry) => normalizeActivityItem(entry))
        .filter((entry): entry is ReaderActivityItem => Boolean(entry));
    const nextItems = dedupeHistoryItems(normalized);
    writeScopedList(READER_HISTORY_KEY_PREFIX, userId, nextItems);
    return nextItems;
};

export const rememberReaderStory = (userId: string, entry: ReaderActivityItem) => {
    const normalized = normalizeActivityItem(entry);
    if (!normalized) {
        return getReaderHistory(userId);
    }

    const history = getReaderHistory(userId);
    const nextItems = [
        normalized,
        ...history.filter((item) => item.storyId !== normalized.storyId)
    ].slice(0, READER_HISTORY_LIMIT);

    writeScopedList(READER_HISTORY_KEY_PREFIX, userId, nextItems);
    return nextItems;
};

export const getReaderBookmarks = (userId: string) =>
    readScopedList(READER_BOOKMARKS_KEY_PREFIX, userId, normalizeBookmark);

export const replaceReaderBookmarks = (userId: string, entries: ReaderBookmark[]) => {
    const normalized = (Array.isArray(entries) ? entries : [])
        .map((entry) => normalizeBookmark(entry))
        .filter((entry): entry is ReaderBookmark => Boolean(entry));
    const nextItems = dedupeBookmarkItems(normalized);
    writeScopedList(READER_BOOKMARKS_KEY_PREFIX, userId, nextItems);
    return nextItems;
};

export const isReaderStoryBookmarked = (userId: string, storyId: string) => {
    const normalizedStoryId = normalizeStorageId(storyId);
    if (!normalizedStoryId) return false;

    return getReaderBookmarks(userId).some((item) => item.storyId === normalizedStoryId);
};

export const toggleReaderBookmark = (userId: string, entry: ReaderActivityItem) => {
    const normalized = normalizeActivityItem(entry);
    const existing = getReaderBookmarks(userId);

    if (!normalized) {
        return {
            bookmarked: false,
            bookmarks: existing
        };
    }

    const found = existing.some((item) => item.storyId === normalized.storyId);
    const nextBookmarks = found
        ? existing.filter((item) => item.storyId !== normalized.storyId)
        : [
            {
                ...normalized,
                savedAt: new Date().toISOString()
            },
            ...existing.filter((item) => item.storyId !== normalized.storyId)
        ].slice(0, READER_BOOKMARK_LIMIT);

    writeScopedList(READER_BOOKMARKS_KEY_PREFIX, userId, nextBookmarks);

    return {
        bookmarked: !found,
        bookmarks: nextBookmarks
    };
};

export const removeReaderBookmark = (userId: string, storyId: string) => {
    const normalizedStoryId = normalizeStorageId(storyId);
    if (!normalizedStoryId) {
        return getReaderBookmarks(userId);
    }

    const nextBookmarks = getReaderBookmarks(userId)
        .filter((item) => item.storyId !== normalizedStoryId);
    writeScopedList(READER_BOOKMARKS_KEY_PREFIX, userId, nextBookmarks);
    return nextBookmarks;
};
