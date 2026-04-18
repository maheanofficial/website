import { listRows } from './_table-store.js';

const PUBLIC_STORY_STATUSES = new Set(['published', 'completed', 'ongoing']);
const PUBLIC_STORY_BLOCKED_COLUMNS = new Set(['submitted_by']);
const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';

const isRecord = (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value) => String(value ?? '').trim();

const readEmbeddedTrashType = (value) => {
    if (!isRecord(value)) return '';
    return normalizeString(value._trashType).toLowerCase();
};

export const extractHiddenStoryIds = (trashRows) => {
    const hiddenIds = new Set();

    (Array.isArray(trashRows) ? trashRows : []).forEach((row) => {
        if (!isRecord(row)) return;

        const trashType = normalizeString(row.type).toLowerCase();
        if (trashType !== 'story') return;

        const embeddedType = readEmbeddedTrashType(row.data);
        if (embeddedType && embeddedType !== 'story') return;

        const originalId = normalizeString(row.original_id ?? row.originalId);
        if (originalId) {
            hiddenIds.add(originalId);
        }
    });

    return hiddenIds;
};

export const isPublicStoryRow = (storyRow, hiddenStoryIds = new Set()) => {
    if (!isRecord(storyRow)) return false;

    const storyId = normalizeString(storyRow.id);
    if (storyId && hiddenStoryIds.has(storyId)) {
        return false;
    }

    if (!Object.prototype.hasOwnProperty.call(storyRow, 'status')) {
        return true;
    }

    const status = normalizeString(storyRow.status).toLowerCase();
    if (!status) {
        return true;
    }

    return PUBLIC_STORY_STATUSES.has(status);
};

export const filterPublicStoryRows = (storyRows, hiddenStoryIds = new Set()) =>
    (Array.isArray(storyRows) ? storyRows : []).filter((row) => isPublicStoryRow(row, hiddenStoryIds));

const sanitizePublicExcerpt = (value) => {
    const excerpt = String(value ?? '');
    if (!excerpt.startsWith(LEGACY_META_START)) {
        return excerpt;
    }

    const markerEndIndex = excerpt.indexOf(LEGACY_META_END);
    if (markerEndIndex < 0) {
        return excerpt;
    }

    const rawMeta = excerpt.slice(LEGACY_META_START.length, markerEndIndex);
    try {
        const parsed = JSON.parse(rawMeta);
        if (!isRecord(parsed)) {
            return excerpt;
        }

        const sanitizedMeta = { ...parsed };
        delete sanitizedMeta.submittedBy;

        return `${LEGACY_META_START}${JSON.stringify(sanitizedMeta)}${LEGACY_META_END}${excerpt.slice(markerEndIndex + LEGACY_META_END.length)}`;
    } catch {
        return excerpt;
    }
};

const sanitizePublicStoryRow = (storyRow) => {
    if (!isRecord(storyRow)) {
        return storyRow;
    }

    const next = { ...storyRow };
    PUBLIC_STORY_BLOCKED_COLUMNS.forEach((column) => {
        delete next[column];
    });
    if (Object.prototype.hasOwnProperty.call(next, 'excerpt')) {
        next.excerpt = sanitizePublicExcerpt(next.excerpt);
    }

    return next;
};

export const sanitizePublicStoryRows = (storyRows) =>
    (Array.isArray(storyRows) ? storyRows : []).map((row) => sanitizePublicStoryRow(row));

export const listHiddenStoryIds = async () => {
    try {
        const rows = await listRows('trash', { columns: '*' });
        return extractHiddenStoryIds(rows);
    } catch (error) {
        console.warn('[public-story-rows] Failed to load trash rows:', error?.message || error);
        return new Set();
    }
};

export const listPublicStoryRows = async (options = {}) => {
    const rows = await listRows('stories', {
        ...options,
        columns: '*',
        single: false
    });
    const hiddenStoryIds = await listHiddenStoryIds();
    return sanitizePublicStoryRows(filterPublicStoryRows(rows, hiddenStoryIds));
};
