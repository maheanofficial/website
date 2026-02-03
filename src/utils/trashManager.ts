// import { supabase } from '../lib/supabase';

export interface TrashItem {
    id: string;
    originalId: string | number;
    type: 'story' | 'author' | 'category';
    data: any;
    deletedAt: string;
    name: string;
}

const STORAGE_KEY = 'mahean_trash';

export const getTrashItems = (): TrashItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const moveToTrash = async (
    type: 'story' | 'author' | 'category',
    originalId: string | number,
    data: any,
    name: string
) => {
    const items = getTrashItems();
    const newItem: TrashItem = {
        id: Date.now().toString(),
        originalId,
        type,
        data,
        deletedAt: new Date().toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        name
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([newItem, ...items]));

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', type, `Moved to trash: ${name}`);
};

export const restoreFromTrash = (trashId: string): TrashItem | null => {
    const items = getTrashItems();
    const itemToRestore = items.find(i => i.id === trashId);

    if (itemToRestore) {
        const updatedItems = items.filter(i => i.id !== trashId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
        return itemToRestore;
    }
    return null;
};

export const permanentDelete = async (trashId: string) => {
    const items = getTrashItems();
    const updatedItems = items.filter(i => i.id !== trashId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));

    const { logActivity } = await import('./activityLogManager');
    await logActivity('permanent_delete', 'system', `Permanently deleted item`);
};

export const emptyTrash = async () => {
    localStorage.removeItem(STORAGE_KEY);

    const { logActivity } = await import('./activityLogManager');
    await logActivity('empty_trash', 'system', `Emptied trash`);
};
