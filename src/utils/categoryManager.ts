// import { supabase } from '../lib/supabase';

export interface Category {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    image?: string;
}

const STORAGE_KEY = 'mahean_categories';

export const getAllCategories = (): Category[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getCategoryById = (id: string): Category | null => {
    const categories = getAllCategories();
    return categories.find(c => c.id === id) || null;
};

export const saveCategory = async (category: Category) => {
    const categories = getAllCategories();
    const existingIndex = categories.findIndex(c => c.id === category.id);

    if (existingIndex >= 0) {
        categories[existingIndex] = category;
    } else {
        categories.push(category);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));

    const { logActivity } = await import('./activityLogManager');
    await logActivity('create', 'category', `Saved category: ${category.name}`);
};

export const deleteCategory = async (id: string) => {
    const categories = getAllCategories();
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('category', id, category, category.name);

    const filtered = categories.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

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
