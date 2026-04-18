import { supabase } from '../lib/supabase';
import { repairMojibakeText } from './textRepair';
import { getAllStories, saveStory, type Story } from './storyManager';
import { getTrashItemsByType } from './trashManager';

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

type DeletedCategoryStorySnapshot = {
    id: string;
    title?: string;
    previousCategory?: string;
    previousCategoryId?: string;
    previousCategories?: string[];
};

type DeletedCategoryTrashPayload = {
    category: Category;
    affectedStories: DeletedCategoryStorySnapshot[];
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

const normalizeCategoryKey = (value: unknown) => repairMojibakeText(String(value ?? '')).trim().toLowerCase();

const getStoryCategories = (story: Story) => {
    const rawValues = story.categories?.length
        ? story.categories
        : [story.category || story.categoryId || ''];
    const seen = new Set<string>();
    const output: string[] = [];

    rawValues.forEach((value) => {
        const normalizedValue = repairMojibakeText(String(value ?? '')).trim();
        const normalizedKey = normalizedValue.toLowerCase();
        if (!normalizedKey || seen.has(normalizedKey)) return;
        seen.add(normalizedKey);
        output.push(normalizedValue);
    });

    return output;
};

const matchesCategory = (story: Story, category: Category) => {
    const storyCategoryKeys = new Set([
        ...getStoryCategories(story).map((entry) => normalizeCategoryKey(entry)),
        normalizeCategoryKey(story.categoryId)
    ].filter(Boolean));
    const categoryName = normalizeCategoryKey(category.name);
    const categoryId = normalizeCategoryKey(category.id);

    if (!categoryName && !categoryId) return false;
    return storyCategoryKeys.has(categoryName)
        || (Boolean(categoryId) && storyCategoryKeys.has(categoryId));
};

const filterDeletedCategories = async (categories: Category[]) => {
    const deletedItems = await getTrashItemsByType('category');
    if (!deletedItems.length) return categories;

    const deletedIds = new Set(
        deletedItems
            .map((item) => normalizeCategoryKey(item.originalId))
            .filter(Boolean)
    );

    if (!deletedIds.size) return categories;
    return categories.filter((category) => !deletedIds.has(normalizeCategoryKey(category.id)));
};

const parseDeletedCategoryPayload = (value: unknown): DeletedCategoryTrashPayload | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    const record = value as Record<string, unknown>;
    const categoryValue = record.category;
    if (!categoryValue || typeof categoryValue !== 'object' || Array.isArray(categoryValue)) {
        return null;
    }

    const categoryRecord = categoryValue as Record<string, unknown>;
    const categoryId = typeof categoryRecord.id === 'string' ? categoryRecord.id.trim() : '';
    const categoryName = repairMojibakeText(typeof categoryRecord.name === 'string' ? categoryRecord.name : '').trim();
    if (!categoryId || !categoryName) {
        return null;
    }

    const affectedStories = Array.isArray(record.affectedStories)
        ? record.affectedStories
            .map((entry) => {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
                const storyRecord = entry as Record<string, unknown>;
                const id = typeof storyRecord.id === 'string' ? storyRecord.id.trim() : '';
                if (!id) return null;
                return {
                    id,
                    title: repairMojibakeText(typeof storyRecord.title === 'string' ? storyRecord.title : '').trim() || undefined,
                    previousCategory: repairMojibakeText(typeof storyRecord.previousCategory === 'string' ? storyRecord.previousCategory : '').trim() || undefined,
                    previousCategoryId: repairMojibakeText(typeof storyRecord.previousCategoryId === 'string' ? storyRecord.previousCategoryId : '').trim() || undefined,
                    previousCategories: Array.isArray(storyRecord.previousCategories)
                        ? storyRecord.previousCategories
                            .filter((item): item is string => typeof item === 'string')
                            .map((item) => repairMojibakeText(item).trim())
                            .filter(Boolean)
                        : undefined
                };
            })
            .filter(Boolean) as DeletedCategoryStorySnapshot[]
        : [];

    return {
        category: {
            id: categoryId,
            name: categoryName,
            slug: repairMojibakeText(typeof categoryRecord.slug === 'string' ? categoryRecord.slug : '').trim() || undefined,
            description: repairMojibakeText(typeof categoryRecord.description === 'string' ? categoryRecord.description : '').trim() || undefined,
            image: typeof categoryRecord.image === 'string' ? categoryRecord.image : undefined
        },
        affectedStories
    };
};

const storeCategories = (categories: Category[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

const getLocalCategories = (): Category[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
        return parsed
            .filter((entry): entry is Partial<Category> => Boolean(entry) && typeof entry === 'object')
            .map((entry) => ({
                id: String(entry.id || '').trim(),
                name: String(entry.name || '').trim(),
                slug: typeof entry.slug === 'string' ? entry.slug : undefined,
                description: typeof entry.description === 'string' ? entry.description : undefined,
                image: typeof entry.image === 'string' ? entry.image : undefined
            }))
            .filter((entry) => entry.id && entry.name);
    } catch (error) {
        console.warn('Failed to parse categories cache; resetting.', error);
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
};

export const getAllCategories = async (): Promise<Category[]> => {
    const localCategories = await filterDeletedCategories(getLocalCategories());
    try {
        const { data, error } = await supabase
            .from(CATEGORY_TABLE)
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const categories = await filterDeletedCategories(((data || []) as CategoryRow[]).map(mapRowToCategory));
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

    const stories = await getAllStories();
    const affectedStories = stories.filter((story) => matchesCategory(story, category));
    for (const story of affectedStories) {
        const remainingCategories = getStoryCategories(story)
            .filter((entry) => normalizeCategoryKey(entry) !== normalizeCategoryKey(category.name));
        const primaryCategory = remainingCategories[0] || '';
        const result = await saveStory({
            ...story,
            category: primaryCategory,
            categoryId: primaryCategory,
            categories: remainingCategories
        });
        if (!result.success) {
            console.warn(`Failed to clear deleted category "${category.name}" from story ${story.id}.`, result.message);
        }
    }

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('category', id, {
        category,
        affectedStories: affectedStories.map((story) => ({
            id: story.id,
            title: story.title,
            previousCategory: story.category || undefined,
            previousCategoryId: story.categoryId || undefined,
            previousCategories: getStoryCategories(story)
        }))
    }, category.name);

    const filtered = categories.filter(c => c.id !== id);
    storeCategories(filtered);

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', 'category', `Deleted category: ${category.name}`);
};

export const restoreCategory = async (value: Category | DeletedCategoryTrashPayload) => {
    const payload = parseDeletedCategoryPayload(value);
    const category = payload?.category || (value as Category);

    await saveCategory(category);

    if (payload?.affectedStories.length) {
        const stories = await getAllStories();
        const storyById = new Map(stories.map((story) => [story.id, story]));

        for (const snapshot of payload.affectedStories) {
            const story = storyById.get(snapshot.id);
            if (!story) continue;

            const restoredCategories = (() => {
                const seen = new Set<string>();
                const output: string[] = [];
                [
                    ...(snapshot.previousCategories || []),
                    ...getStoryCategories(story),
                    snapshot.previousCategory || category.name
                ].forEach((value) => {
                    const normalizedValue = repairMojibakeText(String(value ?? '')).trim();
                    const normalizedKey = normalizedValue.toLowerCase();
                    if (!normalizedKey || seen.has(normalizedKey)) return;
                    seen.add(normalizedKey);
                    output.push(normalizedValue);
                });
                return output;
            })();
            const primaryCategory = restoredCategories[0] || '';

            const result = await saveStory({
                ...story,
                category: primaryCategory,
                categoryId: snapshot.previousCategoryId || primaryCategory || category.id,
                categories: restoredCategories
            });
            if (!result.success) {
                console.warn(`Failed to restore category "${category.name}" on story ${story.id}.`, result.message);
            }
        }
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('restore', 'category', `Restored category: ${category.name}`);
};

// Alias for backward compatibility
export const getCategories = getAllCategories;
