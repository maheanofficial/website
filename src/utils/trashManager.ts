import { supabase } from '../lib/supabase';

export interface TrashItem {
    id: string;
    originalId: string | number;
    type: 'story' | 'author' | 'category';
    data: unknown;
    deletedAt: string;
    name: string;
}

const STORAGE_KEY = 'mahean_trash';
const TRASH_TABLE = 'trash';

type TrashRow = {
    id: string;
    original_id: string;
    type: TrashItem['type'];
    data: unknown;
    deleted_at?: string | null;
    name: string;
};

const formatDeletedAt = (value?: string | null) => {
    const date = value ? new Date(value) : new Date();
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
    deletedAt: formatDeletedAt(row.deleted_at),
    name: row.name
});

const storeTrashItems = (items: TrashItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const getLocalTrashItems = (): TrashItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getTrashItems = async (): Promise<TrashItem[]> => {
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
    const items = getLocalTrashItems();
    const newItem: TrashItem = {
        id: Date.now().toString(),
        originalId,
        type,
        data,
        deletedAt: formatDeletedAt(),
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
                deleted_at: new Date().toISOString()
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
