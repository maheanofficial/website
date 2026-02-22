import { supabase } from '../lib/supabase';
import { repairMojibakeText } from './textRepair';

export interface Category {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    image?: string;
}

const STORAGE_KEY = 'mahean_categories';
const CATEGORY_TABLE = 'categories';

type CategoryRow = {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    image?: string | null;
};

const mapRowToCategory = (row: CategoryRow): Category => ({
    id: row.id,
    name: repairMojibakeText(row.name ?? ''),
    slug: repairMojibakeText(row.slug ?? '') || undefined,
    description: repairMojibakeText(row.description ?? '') || undefined,
    image: row.image ?? undefined
});

const mapCategoryToRow = (category: Category) => ({
    id: category.id,
    name: repairMojibakeText(category.name),
    slug: repairMojibakeText(category.slug ?? '') || null,
    description: repairMojibakeText(category.description ?? '') || null,
    image: category.image ?? null
});

const storeCategories = (categories: Category[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

const getLocalCategories = (): Category[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getAllCategories = async (): Promise<Category[]> => {
    const localCategories = getLocalCategories();
    try {
        const { data, error } = await supabase
            .from(CATEGORY_TABLE)
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const categories = (data || []).map(mapRowToCategory);
        storeCategories(categories);
        return categories;
    } catch (error) {
        console.warn('Supabase categories fetch failed', error);
        return localCategories;
    }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
    const categories = await getAllCategories();
    return categories.find(c => c.id === id) || null;
};

export const saveCategory = async (category: Category) => {
    const categories = getLocalCategories();
    const existingIndex = categories.findIndex(c => c.id === category.id);

    if (existingIndex >= 0) {
        categories[existingIndex] = category;
    } else {
        categories.push(category);
    }

    storeCategories(categories);

    try {
        const { error } = await supabase
            .from(CATEGORY_TABLE)
            .upsert(mapCategoryToRow(category), { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase category upsert failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('create', 'category', `Saved category: ${category.name}`);
};

export const deleteCategory = async (id: string) => {
    const categories = getLocalCategories();
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('category', id, category, category.name);

    const filtered = categories.filter(c => c.id !== id);
    storeCategories(filtered);

    try {
        const { error } = await supabase
            .from(CATEGORY_TABLE)
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase category delete failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', 'category', `Deleted category: ${category.name}`);
};

export const restoreCategory = async (category: Category) => {
    await saveCategory(category);
    const { logActivity } = await import('./activityLogManager');
    await logActivity('restore', 'category', `Restored category: ${category.name}`);
};

// Alias for backward compatibility
export const getCategories = getAllCategories;
