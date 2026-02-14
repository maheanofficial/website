import { supabase } from '../lib/supabase';
import { slugify } from './slugify';

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
    tags?: string[];
    parts?: StoryPart[];
    comments?: number;
    is_featured?: boolean;
    readTime?: string;
    status?: 'published' | 'pending' | 'rejected' | 'draft';
    submittedBy?: string; // userId of the writer
}

const STORAGE_KEY = 'mahean_stories';
const STORY_TABLE = 'stories';

type StoryRow = {
    id: string;
    title: string;
    excerpt?: string | null;
    content?: string | null;
    author_id?: string | null;
    author?: string | null;
    category_id?: string | null;
    category?: string | null;
    views?: number | null;
    image?: string | null;
    cover_image?: string | null;
    slug?: string | null;
    tags?: unknown;
    parts?: unknown;
    comments?: number | null;
    is_featured?: boolean | null;
    read_time?: string | null;
    status?: string | null;
    submitted_by?: string | null;
    date?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type StoryMutationResult = {
    success: boolean;
    synced: boolean;
    story?: Story;
    message?: string;
};

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const mergeStories = (primary: Story[], secondary: Story[]) => {
    const map = new Map<string, Story>();
    secondary.forEach(story => map.set(story.id, normalizeStory(story)));
    primary.forEach(story => map.set(story.id, normalizeStory(story)));
    return Array.from(map.values());
};

const normalizeStoryStatus = (value?: string | null): Story['status'] | undefined => {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
        case 'published':
        case 'pending':
        case 'rejected':
        case 'draft':
            return normalized;
        case 'completed':
        case 'ongoing':
            // Legacy public statuses; treat as published so they don't surface in the UI.
            return 'published';
        default:
            return undefined;
    }
};

const toStoryStatus = (value?: string | null): Story['status'] => normalizeStoryStatus(value) || 'published';

type LegacyStoryMeta = {
    status?: Story['status'];
    submittedBy?: string;
    author?: string;
    category?: string;
    coverImage?: string;
    slug?: string;
    tags?: string[];
    parts?: StoryPart[];
    comments?: number;
    isFeatured?: boolean;
    readTime?: string;
};

type SupabaseErrorLike = {
    code?: string;
    message?: string;
};

const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';
const MISSING_COLUMN_REGEX = /Could not find the '([^']+)' column/i;
const unsupportedStoryColumns = new Set<string>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const toStoryParts = (value: unknown): StoryPart[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            if (!isRecord(entry)) return null;
            const title = typeof entry.title === 'string' ? entry.title : '';
            const content = typeof entry.content === 'string' ? entry.content : '';
            const id = typeof entry.id === 'string' ? entry.id : undefined;
            if (!title && !content) return null;
            return { id, title, content };
        })
        .filter(Boolean) as StoryPart[];
};

const buildLegacyStoryMeta = (story: Story): LegacyStoryMeta => {
    const normalizedStatus = toStoryStatus(story.status);
    const storyParts = Array.isArray(story.parts) ? story.parts : [];
    const legacyParts = storyParts.length > 1
        ? storyParts
        : storyParts.length === 1 && storyParts[0]?.title?.trim()
            ? [{
                id: storyParts[0].id,
                title: storyParts[0].title.trim(),
                // Avoid duplicating long story content in excerpt meta for single-part stories.
                content: ''
            }]
            : undefined;
    return {
        status: normalizedStatus,
        submittedBy: story.submittedBy || undefined,
        author: story.author || undefined,
        category: story.category || story.categoryId || undefined,
        coverImage: story.cover_image || story.image || undefined,
        slug: story.slug || undefined,
        tags: story.tags?.length ? story.tags : undefined,
        parts: legacyParts,
        comments: typeof story.comments === 'number' ? story.comments : undefined,
        isFeatured: typeof story.is_featured === 'boolean' ? story.is_featured : undefined,
        readTime: story.readTime || undefined
    };
};

const hasLegacyStoryMeta = (meta: LegacyStoryMeta) =>
    Object.values(meta).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
    });

const encodeExcerptWithMeta = (excerpt: string, meta: LegacyStoryMeta) => {
    if (!hasLegacyStoryMeta(meta)) {
        return excerpt;
    }
    return `${LEGACY_META_START}${JSON.stringify(meta)}${LEGACY_META_END}${excerpt}`;
};

const parseExcerptWithMeta = (excerpt?: string | null): { excerpt: string; meta: LegacyStoryMeta | null } => {
    const value = excerpt ?? '';
    if (!value.startsWith(LEGACY_META_START)) {
        return { excerpt: value, meta: null };
    }

    const markerEndIndex = value.indexOf(LEGACY_META_END);
    if (markerEndIndex < 0) {
        return { excerpt: value, meta: null };
    }

    const rawMeta = value.slice(LEGACY_META_START.length, markerEndIndex);
    try {
        const parsed = JSON.parse(rawMeta) as unknown;
        if (!isRecord(parsed)) {
            return { excerpt: value, meta: null };
        }
        const meta: LegacyStoryMeta = {
            status: normalizeStoryStatus(typeof parsed.status === 'string' ? parsed.status : undefined),
            submittedBy: typeof parsed.submittedBy === 'string' ? parsed.submittedBy : undefined,
            author: typeof parsed.author === 'string' ? parsed.author : undefined,
            category: typeof parsed.category === 'string' ? parsed.category : undefined,
            coverImage: typeof parsed.coverImage === 'string' ? parsed.coverImage : undefined,
            slug: typeof parsed.slug === 'string' ? parsed.slug : undefined,
            tags: toStringArray(parsed.tags),
            parts: toStoryParts(parsed.parts),
            comments: typeof parsed.comments === 'number' ? parsed.comments : undefined,
            isFeatured: typeof parsed.isFeatured === 'boolean' ? parsed.isFeatured : undefined,
            readTime: typeof parsed.readTime === 'string' ? parsed.readTime : undefined
        };
        return {
            excerpt: value.slice(markerEndIndex + LEGACY_META_END.length),
            meta
        };
    } catch (error) {
        console.warn('Failed to parse legacy story metadata from excerpt', error);
        return { excerpt: value, meta: null };
    }
};

const extractMissingStoryColumn = (error: unknown): string | null => {
    const candidate = error as SupabaseErrorLike | null;
    if (!candidate || typeof candidate !== 'object') return null;
    if (candidate.code !== 'PGRST204' || typeof candidate.message !== 'string') return null;
    const match = candidate.message.match(MISSING_COLUMN_REGEX);
    return match?.[1] ?? null;
};

const getSupabaseErrorMessage = (error: unknown, fallback: string) => {
    const candidate = error as SupabaseErrorLike | null;
    if (!candidate || typeof candidate !== 'object' || typeof candidate.message !== 'string') {
        return fallback;
    }
    const message = candidate.message.trim();
    if (!message) return fallback;
    return `${fallback} (${message})`;
};

const upsertStoryRowWithColumnFallback = async (row: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { ...row };
    unsupportedStoryColumns.forEach((columnName) => {
        delete payload[columnName];
    });

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const { error } = await supabase
            .from(STORY_TABLE)
            .upsert(payload, { onConflict: 'id' });

        if (!error) {
            return { error: null };
        }

        lastError = error;
        const missingColumn = extractMissingStoryColumn(error);
        if (!missingColumn || !(missingColumn in payload)) {
            break;
        }

        unsupportedStoryColumns.add(missingColumn);
        delete payload[missingColumn];
    }

    return { error: lastError };
};

const mapRowToStory = (row: StoryRow): Story => {
    const parsedExcerpt = parseExcerptWithMeta(row.excerpt);
    const content = row.content ?? '';
    const rowTags = toArray<string>(row.tags);
    const rowParts = toArray<StoryPart>(row.parts);
    const fallbackParts = content
        ? [{ id: `${row.id}-part-1`, title: 'Part 01', content }]
        : [];
    const legacyMeta = parsedExcerpt.meta;
    const rawLegacyParts = legacyMeta?.parts?.length ? legacyMeta.parts : [];
    const legacyParts = rawLegacyParts.length === 1 && !rawLegacyParts[0].content && content
        ? [{ ...rawLegacyParts[0], content }]
        : rawLegacyParts;
    const parts = rowParts.length ? rowParts : (legacyParts.length ? legacyParts : fallbackParts);
    const resolvedSlug = (row.slug ?? legacyMeta?.slug ?? '').trim();
    const slugValue = resolvedSlug || slugify(row.title);

    return {
        id: row.id,
        title: row.title,
        excerpt: parsedExcerpt.excerpt,
        content,
        authorId: row.author_id ?? '',
        categoryId: row.category_id ?? '',
        views: row.views ?? 0,
        image: row.image ?? row.cover_image ?? legacyMeta?.coverImage ?? undefined,
        date: row.date ?? row.created_at ?? new Date().toISOString(),
        slug: slugValue || undefined,
        author: row.author ?? legacyMeta?.author ?? undefined,
        category: row.category ?? row.category_id ?? legacyMeta?.category ?? undefined,
        cover_image: row.cover_image ?? legacyMeta?.coverImage ?? undefined,
        tags: rowTags.length ? rowTags : (legacyMeta?.tags ?? []),
        parts,
        comments: row.comments ?? legacyMeta?.comments ?? 0,
        is_featured: row.is_featured ?? legacyMeta?.isFeatured ?? false,
        readTime: row.read_time ?? legacyMeta?.readTime ?? undefined,
        status: toStoryStatus(row.status ?? legacyMeta?.status),
        submittedBy: row.submitted_by ?? legacyMeta?.submittedBy ?? undefined
    };
};

const mapStoryToRow = (story: Story): Record<string, unknown> => {
    const meta = buildLegacyStoryMeta(story);

    return {
        id: story.id,
        title: story.title,
        excerpt: encodeExcerptWithMeta(story.excerpt ?? '', meta),
        content: story.content ?? '',
        author_id: story.authorId ?? '',
        author: story.author ?? null,
        category_id: story.categoryId ?? story.category ?? '',
        category: story.category ?? story.categoryId ?? null,
        views: story.views ?? 0,
        image: story.image ?? null,
        cover_image: story.cover_image ?? null,
        slug: story.slug ?? null,
        tags: story.tags ?? [],
        parts: story.parts ?? [],
        comments: story.comments ?? 0,
        is_featured: story.is_featured ?? false,
        read_time: story.readTime ?? null,
        status: toStoryStatus(story.status),
        submitted_by: story.submittedBy ?? null,
        date: story.date ?? new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

const normalizeStory = (story: Story): Story => ({
    ...story,
    views: story.views ?? 0,
    comments: story.comments ?? 0,
    status: toStoryStatus(story.status),
    date: story.date ?? new Date().toISOString(),
    categoryId: story.categoryId ?? story.category ?? '',
    category: story.category ?? story.categoryId,
    authorId: story.authorId ?? story.submittedBy ?? '',
    author: story.author ?? story.submittedBy
});

const sortStoriesByDate = (stories: Story[]) =>
    [...stories].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const storeStories = (stories: Story[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
};

// Internal helper to get raw list
const getRawStories = (): Story[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // Seed with initial data if empty
        const initialStories: Story[] = [
            {
                id: '1',
                title: 'পুরানো সেই দিনের কথা', // Rabindranath
                excerpt: 'অতীতের স্মৃতিচারণ আর হারানো দিনের গল্প...',
                content: 'অনেক দিন আগের কথা, যখন সময়টা ছিল বড্ড ধীরগতির...',
                authorId: '1',
                categoryId: 'classic',
                views: 1250,
                date: new Date().toISOString(),
                author: 'রবীন্দ্রনাথ ঠাকুর',
                category: 'ক্লাসিক',
                image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8',
                tags: ['ক্লাসিক', 'স্মৃতি', 'গ্রামবাংলা'],
                is_featured: true,
                status: 'published'
            },
            {
                id: '2',
                title: 'দেবী', // Humayun Ahmed
                excerpt: 'রানুর স্বপ্নের মধ্যে কি সত্যিই কোনো রহস্য লুকিয়ে আছে?',
                content: 'রানুকে আমি প্রথম দেখি যখন তার বয়স দশ...',
                authorId: '2',
                categoryId: 'thriller',
                views: 3400,
                date: new Date(Date.now() - 86400000).toISOString(),
                author: 'হুমায়ূন আহমেদ',
                category: 'মিসির আলি',
                image: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a',
                tags: ['রহস্য', 'মনস্তাত্ত্বিক', 'থ্রিলার'],
                is_featured: true,
                status: 'published'
            },
            {
                id: '3',
                title: 'নীলোপল', // Sunil
                excerpt: 'কাকাবাবু কি পারবেন নীল বিদ্রোহের রহস্য ভেদ করতে?',
                content: 'পাহাড়ের উপর থেকে নিচের খাদটা দেখা যাচ্ছে...',
                authorId: '3',
                categoryId: 'adventure',
                views: 2100,
                date: new Date(Date.now() - 172800000).toISOString(),
                author: 'সুনীল গঙ্গোপাধ্যায়',
                category: 'অ্যাডভেঞ্চার',
                image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
                tags: ['অ্যাডভেঞ্চার', 'রোমাঞ্চ', 'ভ্রমণ'],
                status: 'published'
            },
            {
                id: '4',
                title: 'মহেশ', // Sarat Chandra
                excerpt: 'গফুর আর তার প্রিয় ষাঁড় মহেশের এক করুণ কাহিনী।',
                content: 'তর্করত্ন মশাই যখন গফুরের উঠোনে পা দিলেন...',
                authorId: '4',
                categoryId: 'tragedy',
                views: 1800,
                date: new Date(Date.now() - 259200000).toISOString(),
                author: 'শরৎচন্দ্র চট্টোপাধ্যায়',
                category: 'ট্র্যাজেডি',
                image: 'https://images.unsplash.com/photo-1599905952671-55883d65017e',
                tags: ['ট্র্যাজেডি', 'সমাজ', 'ক্লাসিক'],
                status: 'published'
            },
            {
                id: '5',
                title: 'সোনার কেল্লা', // Satyajit Ray
                excerpt: 'মুকুল কি পারবে তার পূর্বজন্মের স্মৃতি খুঁজে পেতে?',
                content: 'ফেলুদা বললেন, তোপসে তৈরী হয়ে নে...',
                authorId: '5',
                categoryId: 'mystery',
                views: 4500,
                date: new Date(Date.now() - 345600000).toISOString(),
                author: 'সত্যজিৎ রায়',
                category: 'গোয়েন্দা',
                image: 'https://images.unsplash.com/photo-1476900966873-12c82823b10b',
                tags: ['গোয়েন্দা', 'রহস্য', 'অভিযান'],
                is_featured: true,
                status: 'published'
            },
            {
                id: '6',
                title: 'পথের পাঁচালী', // Bibhutibhushan
                excerpt: 'অপু আর দুর্গার শৈশব, গ্রামীণ বাংলার এক শাশ্বত চিত্র।',
                content: 'হরিহর রায়ের আদি নিবাস ছিল যশোহর জেলার...',
                authorId: '6',
                categoryId: 'novel',
                views: 2800,
                date: new Date(Date.now() - 432000000).toISOString(),
                author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
                category: 'উপন্যাস',
                image: 'https://images.unsplash.com/photo-1516934024742-b461fba47600',
                tags: ['উপন্যাস', 'পরিবার', 'জীবন'],
                status: 'published'
            },
            {
                id: '7',
                title: 'ভূতুড়ে ঘড়ি', // Shirshendu
                excerpt: 'পুরানো বাড়ির চিলেকোঠায় পাওয়া অদ্ভুত এক ঘড়ির গল্প।',
                content: 'ঘড়িটা যখন দম দিলাম, তখন রাত বারোটা...',
                authorId: '7',
                categoryId: 'ghost',
                views: 1560,
                date: new Date(Date.now() - 518400000).toISOString(),
                author: 'শীর্ষেন্দু মুখোপাধ্যায়',
                category: 'ভূতের গল্প',
                image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744',
                tags: ['ভৌতিক', 'ভূত', 'রহস্য'],
                status: 'published'
            },
            {
                id: '8',
                title: 'বিদ্রোহী', // Nazrul
                excerpt: 'বল বীর, বল উন্নত মম শির...',
                content: 'মহা-বিদ্রোহী রণক্লান্ত, আমি সেই দিন হব শান্ত...',
                authorId: '8',
                categoryId: 'poetry',
                views: 5000,
                date: new Date(Date.now() - 604800000).toISOString(),
                category: 'রোমান্টিক',
                image: 'https://images.unsplash.com/photo-1518893494013-481c1d8ed3fd',
                tags: ['কবিতা', 'রোমান্টিক', 'বিদ্রোহ'],
                status: 'published'
            },
            {
                id: '9',
                title: 'কপালকুণ্ডলা', // Bankim
                excerpt: 'পথিক, তুমি কি পথ হারাইয়াছ?',
                content: 'নবকুমার যখন বনমধ্যে প্রবেশ করিলেন...',
                authorId: '9',
                categoryId: 'romance',
                views: 1950,
                date: new Date(Date.now() - 691200000).toISOString(),
                author: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়',
                category: 'রোমান্টিক',
                image: 'https://images.unsplash.com/photo-1518893494013-481c1d8ed3fd',
                tags: ['?????????', '?????', '???????'],
                status: 'published'
            },
            {
                id: '10',
                title: 'অশরীরের ছায়া', // Mahean
                excerpt: 'এক ঝড়ের রাতে রেডিও স্টেশনে ঘটে যাওয়া অদ্ভুত ঘটনা।',
                content: 'মাঝরাত। আমি স্টুডিওতে একা...',
                authorId: '10',
                categoryId: 'horror',
                views: 890,
                date: new Date(Date.now() - 777600000).toISOString(),
                author: 'মাহিয়ান আহমেদ',
                category: 'হরর',
                image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c',
                tags: ['হরর', 'অলৌকিক', 'থ্রিলার'],
                status: 'published'
            }
        ];
        storeStories(initialStories);
        return initialStories;
    }
    try {
        return JSON.parse(stored);
    } catch (error) {
        console.warn('Failed to parse local stories cache; resetting.', error);
        localStorage.removeItem(STORAGE_KEY);
        return getRawStories();
    }
};

// Public facing - only published
export const getStories = async (): Promise<Story[]> => {
    const localStories = getRawStories();
    try {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        const stories = (data || []).map(mapRowToStory);
        const mergedStories = sortStoriesByDate(mergeStories(stories, localStories));
        storeStories(mergedStories);
        // Show only published stories; legacy public statuses are normalized to published.
        return mergedStories.filter((story) => (story.status ?? 'published') === 'published');
    } catch (error) {
        console.warn('Supabase stories fetch failed', error);
        return sortStoriesByDate(localStories.map(normalizeStory))
            .filter((story) => (story.status ?? 'published') === 'published');
    }
};

// Admin facing - all stories
export const getAllStories = async (): Promise<Story[]> => {
    const localStories = getRawStories();
    try {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        const stories = (data || []).map(mapRowToStory);
        const mergedStories = sortStoriesByDate(mergeStories(stories, localStories));
        storeStories(mergedStories);
        return mergedStories;
    } catch (error) {
        console.warn('Supabase stories fetch failed', error);
        return sortStoriesByDate(localStories);
    }
};

export const getStoryById = async (id: string): Promise<Story | null> => {
    const localStories = getRawStories();
    try {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            return mapRowToStory(data);
        }
    } catch (error) {
        console.warn('Supabase story lookup failed', error);
    }

    return localStories.find(s => s.id === id) || null;
};

export const saveStory = async (story: Story): Promise<StoryMutationResult> => {
    const stories = getRawStories();
    const previousStories = [...stories];
    const existingIndex = stories.findIndex(s => s.id === story.id);
    const normalized = normalizeStory({
        ...story,
        status: story.status
            || (existingIndex >= 0 ? (stories[existingIndex].status || 'published') : 'published')
    });

    if (existingIndex >= 0) {
        stories[existingIndex] = normalized;
    } else {
        stories.unshift(normalized);
    }

    storeStories(stories);

    try {
        const result = await upsertStoryRowWithColumnFallback(mapStoryToRow(normalized));
        if (result.error) throw result.error;
    } catch (error) {
        console.warn('Supabase story upsert failed', error);
        storeStories(previousStories);
        return {
            success: false,
            synced: false,
            story: normalized,
            message: getSupabaseErrorMessage(error, 'Story save failed on server.')
        };
    }

    const { logActivity } = await import('./activityLogManager');
    const action = existingIndex >= 0 ? 'update' : 'create';
    await logActivity(action, 'story', `${action === 'create' ? 'Created' : 'Updated'} story: ${normalized.title} (${normalized.status})`);
    return {
        success: true,
        synced: true,
        story: normalized
    };
};

export const updateStoryStatus = async (
    id: string,
    status: 'published' | 'pending' | 'rejected' | 'draft'
): Promise<StoryMutationResult> => {
    const stories = getRawStories();
    const storyIndex = stories.findIndex(s => s.id === id);
    if (storyIndex < 0) {
        return {
            success: false,
            synced: false,
            message: 'Story not found.'
        };
    }

    const nextStatus = toStoryStatus(status);
    const previousStory = { ...stories[storyIndex] };
    stories[storyIndex] = normalizeStory({ ...stories[storyIndex], status: nextStatus });
    storeStories(stories);

    try {
        const result = await upsertStoryRowWithColumnFallback(mapStoryToRow(stories[storyIndex]));
        if (result.error) throw result.error;
    } catch (error) {
        console.warn('Supabase story status update failed', error);
        stories[storyIndex] = previousStory;
        storeStories(stories);
        return {
            success: false,
            synced: false,
            story: previousStory,
            message: getSupabaseErrorMessage(error, 'Story status update failed on server.')
        };
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('update', 'story', `Changed status of "${stories[storyIndex].title}" to ${nextStatus}`);
    return {
        success: true,
        synced: true,
        story: stories[storyIndex]
    };
};

export const deleteStory = async (id: string) => {
    const stories = getRawStories();
    const story = stories.find(s => s.id === id);
    if (!story) return;

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('story', id, story, story.title);

    const filtered = stories.filter(s => s.id !== id);
    storeStories(filtered);

    try {
        const { error } = await supabase
            .from(STORY_TABLE)
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase story delete failed', error);
    }

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

export const incrementViews = async (id: string) => {
    const stories = getRawStories();
    const story = stories.find(s => s.id === id);
    if (story) {
        story.views = (story.views || 0) + 1;
        storeStories(stories);

        try {
            const { error } = await supabase
                .from(STORY_TABLE)
                .update({ views: story.views, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.warn('Supabase story views update failed', error);
        }
    }
};
