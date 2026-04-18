import { supabase } from '../lib/supabase';

export interface TrashItem {
    id: string;
    originalId: string | number;
    type: TrashItemType;
    data: unknown;
    deletedAt: string;
    deletedAtISO: string;
    name: string;
}

export type TrashItemType = 'story' | 'author' | 'category' | 'tag' | 'story_part';

const STORAGE_KEY = 'mahean_trash';
const TRASH_TABLE = 'trash';
const STORY_STORAGE_KEY = 'mahean_stories';
const AUTHOR_STORAGE_KEY = 'mahean_authors';
const CATEGORY_STORAGE_KEY = 'mahean_categories';
const STORY_TABLE = 'stories';
const AUTHOR_TABLE = 'authors';
const CATEGORY_TABLE = 'categories';
export const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const TRASH_TYPE_CACHE_TTL_MS = 15_000;

type TrashRow = {
    id: string;
    original_id: string;
    type: string;
    data: unknown;
    deleted_at?: string | null;
    name: string;
};

type TrashTypeCacheEntry = {
    expiresAt: number;
    items: TrashItem[];
};

const trashTypeCache = new Map<TrashItemType, TrashTypeCacheEntry>();
let lastPurgeCheckAt = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isTrashType = (value: unknown): value is TrashItemType =>
    value === 'story'
    || value === 'author'
    || value === 'category'
    || value === 'tag'
    || value === 'story_part';

const toRemoteTrashType = (value: TrashItemType): 'story' | 'author' | 'category' => {
    if (value === 'author' || value === 'category') return value;
    return 'story';
};

const readEmbeddedTrashType = (value: unknown): TrashItemType | null => {
    if (!isRecord(value)) return null;
    const embeddedType = value._trashType;
    return isTrashType(embeddedType) ? embeddedType : null;
};

const withEmbeddedTrashType = (value: unknown, type: TrashItemType, remoteType: string) => {
    if (type === remoteType) {
        return value;
    }
    if (isRecord(value)) {
        return {
            ...value,
            _trashType: type
        };
    }
    return {
        _trashType: type,
        value
    };
};

const toISOOrNull = (value?: string | null): string | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseTimestampId = (id: string): string | null => {
    const numeric = Number(id);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const parsed = new Date(numeric);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeDeletedAtISO = (value: {
    deletedAtISO?: string | null;
    deletedAt?: string | null;
    id: string;
}) =>
    toISOOrNull(value.deletedAtISO)
    || toISOOrNull(value.deletedAt)
    || parseTimestampId(value.id)
    || new Date().toISOString();

const formatDeletedAt = (value?: string | null) => {
    const deletedAtISO = toISOOrNull(value) || new Date().toISOString();
    const date = new Date(deletedAtISO);
    return date.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const mapRowToTrashItem = (row: TrashRow): TrashItem => ({
    id: row.id,
    originalId: row.original_id,
    type: readEmbeddedTrashType(row.data) || (isTrashType(row.type) ? row.type : 'story'),
    data: row.data,
    deletedAtISO: normalizeDeletedAtISO({
        deletedAtISO: row.deleted_at,
        id: row.id
    }),
    deletedAt: formatDeletedAt(row.deleted_at),
    name: row.name
});

const invalidateTrashTypeCache = (type?: TrashItemType) => {
    if (type) {
        trashTypeCache.delete(type);
        return;
    }
    trashTypeCache.clear();
};

const storeTrashItems = (items: TrashItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const normalizeLocalTrashItem = (value: unknown): TrashItem | null => {
    if (!isRecord(value)) return null;

    const id = typeof value.id === 'string' ? value.id : null;
    const originalId = value.originalId ?? value.original_id ?? id;
    const type = value.type;
    const name = typeof value.name === 'string' ? value.name : '';
    const deletedAtISO = normalizeDeletedAtISO({
        deletedAtISO: typeof value.deletedAtISO === 'string' ? value.deletedAtISO : undefined,
        deletedAt: typeof value.deletedAt === 'string' ? value.deletedAt : undefined,
        id: id ?? Date.now().toString()
    });

    if (!id || !isTrashType(type)) return null;

    return {
        id,
        originalId: typeof originalId === 'string' || typeof originalId === 'number'
            ? originalId
            : id,
        type,
        data: value.data,
        deletedAtISO,
        deletedAt: formatDeletedAt(deletedAtISO),
        name
    };
};

const getLocalTrashItems = (): TrashItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeLocalTrashItem).filter(Boolean) as TrashItem[];
    } catch (error) {
        console.warn('Failed to parse local trash cache; resetting.', error);
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
};

const isExpiredTrashItem = (item: TrashItem, now = Date.now()) =>
    new Date(item.deletedAtISO).getTime() <= now - TRASH_RETENTION_MS;

const isAuthRequiredError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false;
    const message = String((error as { message?: string }).message || '').toLowerCase();
    return message.includes('authentication is required') || message.includes('auth_required');
};

const purgeExpiredLocalItems = (now = Date.now()) => {
    const items = getLocalTrashItems();
    const expiredItems = items.filter(item => isExpiredTrashItem(item, now));
    const activeItems = items.filter(item => !isExpiredTrashItem(item, now));
    if (activeItems.length !== items.length) {
        storeTrashItems(activeItems);
    }
    return {
        activeItems,
        expiredItems,
        removedCount: items.length - activeItems.length
    };
};

const getRemoteTrashItemById = async (trashId: string): Promise<TrashItem | null> => {
    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .select('*')
            .eq('id', trashId)
            .maybeSingle();
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return null;
        return mapRowToTrashItem(row as TrashRow);
    } catch (error) {
        console.warn('Supabase trash item lookup failed', error);
        return null;
    }
};

const removeItemFromStoredCollection = (storageKey: string, originalId: string) => {
    if (typeof window === 'undefined') return;

    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            localStorage.removeItem(storageKey);
            return;
        }

        const filtered = parsed.filter((entry) => {
            if (!isRecord(entry)) return true;
            return String(entry.id ?? '') !== originalId;
        });

        localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch (error) {
        console.warn(`Failed to update ${storageKey} while finalizing trash deletion.`, error);
    }
};

const deleteRemoteSourceRow = async (table: string, originalId: string) => {
    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', originalId);
        if (error) throw error;
    } catch (error) {
        console.warn(`Supabase ${table} permanent delete failed`, error);
    }
};

const finalizePermanentDelete = async (item: TrashItem) => {
    const originalId = String(item.originalId);
    switch (item.type) {
        case 'story':
            removeItemFromStoredCollection(STORY_STORAGE_KEY, originalId);
            await deleteRemoteSourceRow(STORY_TABLE, originalId);
            return;
        case 'author':
            removeItemFromStoredCollection(AUTHOR_STORAGE_KEY, originalId);
            await deleteRemoteSourceRow(AUTHOR_TABLE, originalId);
            return;
        case 'category':
            removeItemFromStoredCollection(CATEGORY_STORAGE_KEY, originalId);
            await deleteRemoteSourceRow(CATEGORY_TABLE, originalId);
            return;
        default:
            return;
    }
};

export const purgeExpiredTrash = async () => {
    const now = Date.now();
    if (lastPurgeCheckAt && now - lastPurgeCheckAt < TRASH_TYPE_CACHE_TTL_MS) {
        return 0;
    }
    lastPurgeCheckAt = now;

    const cutoffISO = new Date(now - TRASH_RETENTION_MS).toISOString();
    const { expiredItems: localExpiredItems } = purgeExpiredLocalItems(now);
    const expiredItemsById = new Map<string, TrashItem>(
        localExpiredItems.map((item) => [item.id, item])
    );

    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .select('*')
            .lt('deleted_at', cutoffISO);
        if (error) throw error;

        ((data || []) as TrashRow[]).forEach((row) => {
            const item = mapRowToTrashItem(row);
            expiredItemsById.set(item.id, item);
        });

        const { error: deleteError } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .lt('deleted_at', cutoffISO);
        if (deleteError) throw deleteError;
    } catch (error) {
        console.warn('Supabase trash auto-clean failed', error);
    }

    for (const item of expiredItemsById.values()) {
        await finalizePermanentDelete(item);
    }

    const totalRemoved = expiredItemsById.size;
    if (totalRemoved > 0) {
        invalidateTrashTypeCache();
        const { logActivity } = await import('./activityLogManager');
        await logActivity('empty_trash', 'system', `Auto-cleaned ${totalRemoved} trash item(s) older than ${TRASH_RETENTION_DAYS} days`);
    }

    return totalRemoved;
};

export const getTrashItems = async (): Promise<TrashItem[]> => {
    await purgeExpiredTrash();
    const localItems = getLocalTrashItems();
    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        const items = ((data || []) as TrashRow[]).map(mapRowToTrashItem);
        storeTrashItems(items);
        invalidateTrashTypeCache();
        return items;
    } catch (error) {
        console.warn('Supabase trash fetch failed', error);
        return localItems;
    }
};

export const getTrashItemsByType = async (type: TrashItemType): Promise<TrashItem[]> => {
    await purgeExpiredTrash();

    const now = Date.now();
    const cached = trashTypeCache.get(type);
    if (cached && cached.expiresAt > now) {
        return cached.items;
    }

    let items = getLocalTrashItems().filter((item) => item.type === type);

    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .select('*')
            .eq('type', toRemoteTrashType(type))
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        items = ((data || []) as TrashRow[])
            .map(mapRowToTrashItem)
            .filter((item) => item.type === type);
    } catch (error) {
        console.warn(`Supabase ${type} trash fetch failed`, error);
        if (isAuthRequiredError(error)) {
            // Do not trust stale local trash cache when server session is missing.
            // This prevents valid stories from being hidden in admin lists.
            items = [];
        }
    }

    trashTypeCache.set(type, {
        items,
        expiresAt: now + TRASH_TYPE_CACHE_TTL_MS
    });

    return items;
};

export const moveToTrash = async (
    type: TrashItemType,
    originalId: string | number,
    data: unknown,
    name: string
) => {
    await purgeExpiredTrash();

    const remoteType = toRemoteTrashType(type);
    const payloadData = withEmbeddedTrashType(data, type, remoteType);
    const deletedAtISO = new Date().toISOString();
    const items = getLocalTrashItems();
    const newItem: TrashItem = {
        id: Date.now().toString(),
        originalId,
        type,
        data: payloadData,
        deletedAtISO,
        deletedAt: formatDeletedAt(deletedAtISO),
        name
    };

    storeTrashItems([newItem, ...items]);
    invalidateTrashTypeCache(type);
    lastPurgeCheckAt = 0;

    try {
        const { error } = await supabase
            .from(TRASH_TABLE)
            .insert({
                id: newItem.id,
                original_id: String(originalId),
                type: remoteType,
                data: payloadData,
                name,
                deleted_at: deletedAtISO
            });
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase trash insert failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', remoteType, `Moved to trash: ${name}`);
};

export const restoreFromTrash = async (trashId: string): Promise<TrashItem | null> => {
    const items = getLocalTrashItems();
    const localItem = items.find(i => i.id === trashId);

    if (localItem) {
        const updatedItems = items.filter(i => i.id !== trashId);
        storeTrashItems(updatedItems);
        lastPurgeCheckAt = 0;
    }

    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .eq('id', trashId)
            .select('*');
        if (error) throw error;
        lastPurgeCheckAt = 0;
        if (data && data.length > 0) {
            const restoredItem = mapRowToTrashItem(data[0] as TrashRow);
            invalidateTrashTypeCache(restoredItem.type);
            return restoredItem;
        }
    } catch (error) {
        console.warn('Supabase trash restore failed', error);
    }

    if (localItem) {
        invalidateTrashTypeCache(localItem.type);
    }
    return localItem || null;
};

export const permanentDelete = async (trashId: string) => {
    const items = getLocalTrashItems();
    const itemToDelete = items.find((item) => item.id === trashId) || await getRemoteTrashItemById(trashId);

    if (itemToDelete) {
        await finalizePermanentDelete(itemToDelete);
    }

    const updatedItems = items.filter(i => i.id !== trashId);
    storeTrashItems(updatedItems);
    lastPurgeCheckAt = 0;

    try {
        const { error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .eq('id', trashId);
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase trash delete failed', error);
    }

    invalidateTrashTypeCache(itemToDelete?.type);
    const { logActivity } = await import('./activityLogManager');
    await logActivity('permanent_delete', 'system', `Permanently deleted item`);
};

export const emptyTrash = async () => {
    const items = await getTrashItems();
    for (const item of items) {
        await finalizePermanentDelete(item);
    }

    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
    lastPurgeCheckAt = 0;

    try {
        const { error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .neq('id', '');
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase trash empty failed', error);
    }

    invalidateTrashTypeCache();
    const { logActivity } = await import('./activityLogManager');
    await logActivity('empty_trash', 'system', `Emptied trash`);
};
