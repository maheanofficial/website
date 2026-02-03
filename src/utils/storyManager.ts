// import { supabase } from '../lib/supabase';

export interface StoryPart {
    id?: string;
    title: string;
    content: string;
}

export interface Story {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    authorId: string;
    categoryId: string;
    views: number;
    image?: string;
    date: string;
    slug?: string;
    author?: string;
    category?: string;
    cover_image?: string;
    parts?: StoryPart[];
    comments?: number;
    is_featured?: boolean;
    readTime?: string;
    status?: 'published' | 'pending' | 'rejected';
    submittedBy?: string; // userId of the writer
}

const STORAGE_KEY = 'mahean_stories';

// Internal helper to get raw list
const getRawStories = (): Story[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // Seed with initial data if empty
        const initialStories: Story[] = [
            {
                id: '1',
                title: 'পুরানো সেই দিনের কথা',
                excerpt: 'গ্রামের মেঠোপথ ধরে হেঁটে চলা এক স্মৃতির গল্প...',
                content: 'অনেক দিন আগের কথা...',
                authorId: '1',
                categoryId: 'memoir',
                views: 120,
                date: new Date().toISOString(),
                author: 'রবীন্দ্রনাথ ঠাকুর',
                category: 'স্মৃতিকথা',
                image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2070&auto=format&fit=crop',
                status: 'published'
            },
            {
                id: '2',
                title: 'অচিনপুরের যাত্রী',
                excerpt: 'এক অদ্ভুত রাতের ট্রেন জার্নির লোমহর্ষক অভিজ্ঞতা...',
                content: 'ট্রেনটা যখন থামল, তখন রাত গভীর...',
                authorId: '2',
                categoryId: 'thriller',
                views: 85,
                date: new Date(Date.now() - 86400000).toISOString(),
                author: 'হুমায়ূন আহমেদ',
                category: 'থ্রিলার',
                image: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?q=80&w=2070&auto=format&fit=crop',
                status: 'published'
            },
            {
                id: '3',
                title: 'মেঘের কোলে রোদ',
                excerpt: 'বর্ষার দিনে জানালার পাশে বসে থাকা এক কিশোরীর ভাবনা...',
                content: 'আজ সকাল থেকেই বৃষ্টি পড়ছে...',
                authorId: '3',
                categoryId: 'romance',
                views: 200,
                date: new Date(Date.now() - 172800000).toISOString(),
                author: 'সুনীল গঙ্গোপাধ্যায়',
                category: 'রোমান্টিক',
                image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop',
                status: 'published'
            }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStories));
        return initialStories;
    }
    return JSON.parse(stored);
};

// Public facing - only published
export const getStories = (): Story[] => {
    const stories = getRawStories();
    // Default to 'published' for legacy stories that don't have a status
    return stories.filter(s => !s.status || s.status === 'published');
};

// Admin facing - all stories
export const getAllStories = (): Story[] => {
    return getRawStories();
};

export const getStoryById = (id: string): Story | null => {
    // Admins might need to preview pending stories, so check raw list
    // Ideally we'd separate this, but for now allow ID lookup to find any story
    const stories = getRawStories();
    return stories.find(s => s.id === id) || null;
};

export const saveStory = async (story: Story) => {
    const stories = getRawStories();
    const existingIndex = stories.findIndex(s => s.id === story.id);

    // Default status if not provided
    if (!story.status) {
        // If it's an update, keep existing status, otherwise default to published (legacy) 
        // OR pending (if we enforce it). 
        // For now, let the UI decide, but fallback to 'published' if missing on legacy.
        story.status = existingIndex >= 0 ? (stories[existingIndex].status || 'published') : 'published';
    }

    if (existingIndex >= 0) {
        stories[existingIndex] = story;
    } else {
        stories.unshift(story);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));

    // TODO: Sync to Supabase

    const { logActivity } = await import('./activityLogManager');
    const action = existingIndex >= 0 ? 'update' : 'create';
    await logActivity(action, 'story', `${action === 'create' ? 'Created' : 'Updated'} story: ${story.title} (${story.status})`);
};

export const updateStoryStatus = async (id: string, status: 'published' | 'pending' | 'rejected') => {
    const stories = getRawStories();
    const story = stories.find(s => s.id === id);
    if (story) {
        story.status = status;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));

        const { logActivity } = await import('./activityLogManager');
        await logActivity('update', 'story', `Changed status of "${story.title}" to ${status}`);
    }
};

export const deleteStory = async (id: string) => {
    const stories = getRawStories();
    const story = stories.find(s => s.id === id);
    if (!story) return;

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('story', id, story, story.title);

    const filtered = stories.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // TODO: Sync to Supabase

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', 'story', `Deleted story: ${story.title}`);
};

export const restoreStory = async (story: Story) => {
    // When restoring, maybe set to pending if it was deleted? 
    // For now, keep as is, just save it back.
    await saveStory(story);
    const { logActivity } = await import('./activityLogManager');
    await logActivity('restore', 'story', `Restored story: ${story.title}`);
};

export const incrementViews = (id: string) => {
    const stories = getRawStories();
    const story = stories.find(s => s.id === id);
    if (story) {
        story.views = (story.views || 0) + 1;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));

        // TODO: Sync to Supabase
    }
};
