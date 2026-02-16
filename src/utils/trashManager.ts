import { supabase } from '../lib/supabase';

export interface TrashItem {
    id: string;
    originalId: string | number;
    type: 'story' | 'author' | 'category';
    data: unknown;
    deletedAt: string;
    deletedAtISO: string;
    name: string;
}

const STORAGE_KEY = 'mahean_trash';
const TRASH_TABLE = 'trash';
export const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

type TrashRow = {
    id: string;
    original_id: string;
    type: TrashItem['type'];
    data: unknown;
    deleted_at?: string | null;
    name: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isTrashType = (value: unknown): value is TrashItem['type'] =>
    value === 'story' || value === 'author' || value === 'category';

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
    type: row.type,
    data: row.data,
    deletedAtISO: normalizeDeletedAtISO({
        deletedAtISO: row.deleted_at,
        id: row.id
    }),
    deletedAt: formatDeletedAt(row.deleted_at),
    name: row.name
});

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

const purgeExpiredLocalItems = (now = Date.now()) => {
    const items = getLocalTrashItems();
    const activeItems = items.filter(item => !isExpiredTrashItem(item, now));
    if (activeItems.length !== items.length) {
        storeTrashItems(activeItems);
    }
    return {
        activeItems,
        removedCount: items.length - activeItems.length
    };
};

export const purgeExpiredTrash = async () => {
    const now = Date.now();
    const cutoffISO = new Date(now - TRASH_RETENTION_MS).toISOString();
    const { removedCount: localRemoved } = purgeExpiredLocalItems(now);

    let remoteRemoved = 0;
    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .lt('deleted_at', cutoffISO)
            .select('id');
        if (error) throw error;
        remoteRemoved = data?.length ?? 0;
    } catch (error) {
        console.warn('Supabase trash auto-clean failed', error);
    }

    const totalRemoved = localRemoved + remoteRemoved;
    if (totalRemoved > 0) {
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

        const items = (data || []).map(mapRowToTrashItem);
        storeTrashItems(items);
        return items;
    } catch (error) {
        console.warn('Supabase trash fetch failed', error);
        return localItems;
    }
};

export const moveToTrash = async (
    type: 'story' | 'author' | 'category',
    originalId: string | number,
    data: unknown,
    name: string
) => {
    await purgeExpiredTrash();

    const deletedAtISO = new Date().toISOString();
    const items = getLocalTrashItems();
    const newItem: TrashItem = {
        id: Date.now().toString(),
        originalId,
        type,
        data,
        deletedAtISO,
        deletedAt: formatDeletedAt(deletedAtISO),
        name
    };

    storeTrashItems([newItem, ...items]);

    try {
        const { error } = await supabase
            .from(TRASH_TABLE)
            .insert({
                id: newItem.id,
                original_id: String(originalId),
                type,
                data,
                name,
                deleted_at: deletedAtISO
            });
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase trash insert failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', type, `Moved to trash: ${name}`);
};

export const restoreFromTrash = async (trashId: string): Promise<TrashItem | null> => {
    const items = getLocalTrashItems();
    const localItem = items.find(i => i.id === trashId);

    if (localItem) {
        const updatedItems = items.filter(i => i.id !== trashId);
        storeTrashItems(updatedItems);
    }

    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .eq('id', trashId)
            .select('*');
        if (error) throw error;
        if (data && data.length > 0) {
            return mapRowToTrashItem(data[0]);
        }
    } catch (error) {
        console.warn('Supabase trash restore failed', error);
    }

    return localItem || null;
};

export const permanentDelete = async (trashId: string) => {
    const items = getLocalTrashItems();
    const updatedItems = items.filter(i => i.id !== trashId);
    storeTrashItems(updatedItems);

    try {
        const { error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .eq('id', trashId);
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase trash delete failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('permanent_delete', 'system', `Permanently deleted item`);
};

export const emptyTrash = async () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }

    try {
        const { error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .neq('id', '');
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase trash empty failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('empty_trash', 'system', `Emptied trash`);
};
