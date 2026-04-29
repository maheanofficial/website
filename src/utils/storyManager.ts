import { supabase } from '../lib/supabase';
import { slugify } from './slugify';
import { stripLegacyStorySlugSuffix } from './storySlug';
import { getTrashItemsByType } from './trashManager';

export interface StoryPart {
    id?: string;
    title: string;
    slug?: string;
    content: string;
}

export interface StorySeason {
    id?: string;
    title?: string;
    parts: StoryPart[];
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
    categories?: string[];
    cover_image?: string;
    tags?: string[];
    parts?: StoryPart[];
    seasons?: StorySeason[];
    comments?: number;
    is_featured?: boolean;
    readTime?: string;
    season?: number;
    status?: 'published' | 'pending' | 'rejected' | 'draft';
    submittedBy?: string;
    updatedAt?: string;
}

const STORAGE_KEY = 'mahean_stories';
const PUBLIC_STORAGE_KEY = 'mahean_public_stories';
const PUBLIC_DETAIL_STORAGE_KEY = 'mahean_public_story_details';
const PUBLIC_CACHE_MODE_KEY = 'mahean_public_stories_cache_mode';
const STORY_REMOTE_CACHE_READY_KEY = 'mahean_public_stories_remote_ready';
const STORY_TABLE = 'stories';
const STORY_LIST_COLUMNS = [
    'id',
    'title',
    'excerpt',
    'author_id',
    'author',
    'category_id',
    'category',
    'views',
    'image',
    'cover_image',
    'slug',
    'tags',
    'parts',
    'seasons',
    'comments',
    'is_featured',
    'read_time',
    'season',
    'status',
    'submitted_by',
    'date',
    'created_at',
    'updated_at'
].join(',');
const STORY_DETAIL_COLUMNS = `${STORY_LIST_COLUMNS},content`;
const STORY_REMOTE_SYNC_TTL_MS = 0; // Always fetch fresh — never serve stale cache
const STORY_REMOTE_CACHE_FRESH_MS = STORY_REMOTE_SYNC_TTL_MS;
const STORY_REMOTE_CACHE_VERSION = 'v4'; // Bumped to invalidate old localStorage cache
const PUBLIC_DETAIL_CACHE_LIMIT = 12;
const LEGACY_SEEDED_STORY_IDS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
const BLOCKED_STORY_SUBMITTER_IDS = new Set(['bed0e197-08dc-4e4d-8ac4-b959692759c1']);
const BLOCKED_STORY_TEXT_PATTERNS = ['tor mayre cdi'];

let storySyncPromise: Promise<Story[]> | null = null;
let lastStorySyncAt = 0;

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
    seasons?: unknown;
    comments?: number | null;
    is_featured?: boolean | null;
    read_time?: string | null;
    season?: number | string | null;
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

const getStoryRecency = (story: Story) => {
    const updatedAtMs = Date.parse(story.updatedAt || '');
    if (Number.isFinite(updatedAtMs)) return updatedAtMs;
    const dateMs = Date.parse(story.date || '');
    if (Number.isFinite(dateMs)) return dateMs;
    return 0;
};

const hasMeaningfulStoryText = (value?: string | null) => String(value ?? '').trim().length > 0;

const getStoryPartsCount = (story: Story) => Array.isArray(story.parts) ? story.parts.length : 0;

const getStoryContentScore = (story: Story) => {
    const contentScore = hasMeaningfulStoryText(story.content) ? 2 : 0;
    const partScore = Array.isArray(story.parts)
        ? story.parts.reduce((total, part) => total + (hasMeaningfulStoryText(part?.content) ? 2 : 0), 0)
        : 0;
    return contentScore + partScore;
};

const pickPreferredStory = (current: Story, incoming: Story) => {
    const currentRecency = getStoryRecency(current);
    const incomingRecency = getStoryRecency(incoming);
    if (incomingRecency > currentRecency) return incoming;
    if (incomingRecency < currentRecency) return current;

    const currentContentScore = getStoryContentScore(current);
    const incomingContentScore = getStoryContentScore(incoming);
    if (incomingContentScore > currentContentScore) return incoming;
    if (incomingContentScore < currentContentScore) return current;

    const currentPartsCount = getStoryPartsCount(current);
    const incomingPartsCount = getStoryPartsCount(incoming);
    if (incomingPartsCount > currentPartsCount) return incoming;
    if (incomingPartsCount < currentPartsCount) return current;

    return incoming;
};

const ensureUniqueStorySlugs = (stories: Story[]) => {
    const cleanSlugCounts = new Map<string, number>();
    const descriptors = stories.map((story) => {
        const originalSlug = slugify(story.slug || '') || slugify(story.title || '');
        const cleanSlug = stripLegacyStorySlugSuffix(originalSlug);
        if (cleanSlug) {
            cleanSlugCounts.set(cleanSlug, (cleanSlugCounts.get(cleanSlug) || 0) + 1);
        }
        return {
            story,
            originalSlug,
            cleanSlug
        };
    });

    return descriptors.map(({ story, originalSlug, cleanSlug }) => {
        const canUseCleanSlug = cleanSlug && (cleanSlugCounts.get(cleanSlug) || 0) === 1;
        const nextSlug = canUseCleanSlug ? cleanSlug : (originalSlug || cleanSlug);

        return {
            ...story,
            slug: nextSlug || undefined
        };
    });
};

const mergeStories = (primary: Story[], secondary: Story[]) => {
    const map = new Map<string, Story>();
    [...secondary, ...primary].forEach((story) => {
        const normalized = normalizeStory(story);
        const existing = map.get(normalized.id);
        if (!existing) {
            map.set(normalized.id, normalized);
            return;
        }
        map.set(normalized.id, pickPreferredStory(existing, normalized));
    });
    return ensureUniqueStorySlugs(Array.from(map.values()));
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

const normalizeSeasonValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.floor(value));
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number.parseInt(trimmed, 10);
        if (Number.isFinite(parsed)) {
            return Math.max(1, Math.floor(parsed));
        }
    }

    return undefined;
};

type LegacyStoryMeta = {
    status?: Story['status'];
    submittedBy?: string;
    author?: string;
    category?: string;
    categories?: string[];
    coverImage?: string;
    slug?: string;
    tags?: string[];
    parts?: StoryPart[];
    comments?: number;
    isFeatured?: boolean;
    readTime?: string;
    season?: number;
};

type SupabaseErrorLike = {
    code?: string;
    message?: string;
};

const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';
const MISSING_COLUMN_REGEX = /Could not find the '([^']+)' column/i;
const unsupportedStoryColumns = new Set<string>();
const MOJIBAKE_PATTERN = /(?:\u00E0\u00A6|\u00E0\u00A7|\u00C3|\u00C2|\u00E2\u20AC|\u00EF\u00BF\u00BD|\uFFFD)/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const scoreMojibake = (value: string) =>
    (value.match(/(?:\u00E0\u00A6|\u00E0\u00A7|\u00C3|\u00C2|\u00E2\u20AC|\u00EF\u00BF\u00BD|\uFFFD)/g) || []).length;

const scoreBangla = (value: string) => (value.match(/[\u0980-\u09FF]/g) || []).length;

const decodeLatin1AsUtf8 = (value: string) => {
    try {
        const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
        return value;
    }
};

const decodeEscapedUnicode = (value: string) =>
    String(value ?? '').replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16))
    );

const repairMojibakeText = (value: string) => {
    const input = decodeEscapedUnicode(String(value || ''));
    if (!input) return '';
    if (!MOJIBAKE_PATTERN.test(input)) return input;

    let current = input;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const decoded = decodeLatin1AsUtf8(current);
        if (!decoded || decoded === current) break;

        const improvedBangla = scoreBangla(decoded) > scoreBangla(current);
        const reducedNoise = scoreMojibake(decoded) < scoreMojibake(current);
        if (!improvedBangla && !reducedNoise) break;

        current = decoded;
    }

    return decodeEscapedUnicode(current);
};

const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => repairMojibakeText(entry).trim())
            .filter(Boolean)
        : [];

const toUniqueStringArray = (value: unknown): string[] => {
    const seen = new Set<string>();
    const output: string[] = [];

    toStringArray(value).forEach((entry) => {
        const key = entry.toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        output.push(entry);
    });

    return output;
};

const normalizeCategoryList = (value: unknown, fallback?: unknown) => {
    const primary = toUniqueStringArray(value);
    if (primary.length) return primary;
    return toUniqueStringArray(fallback);
};

const toStoryParts = (value: unknown): StoryPart[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            if (!isRecord(entry)) return null;
            const title = repairMojibakeText(typeof entry.title === 'string' ? entry.title : '');
            const content = repairMojibakeText(typeof entry.content === 'string' ? entry.content : '');
            const id = typeof entry.id === 'string' ? entry.id : undefined;
            const slug = typeof entry.slug === 'string' ? repairMojibakeText(entry.slug).trim() : '';
            if (!title && !content) return null;
            return { id, title, slug: slug || undefined, content };
        })
        .filter(Boolean) as StoryPart[];
};

const toStorySeasons = (value: unknown): StorySeason[] | undefined => {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    const seasons = value
        .map((entry) => {
            if (!isRecord(entry)) return null;
            const id = typeof entry.id === 'string' ? entry.id : undefined;
            const title = typeof entry.title === 'string' ? repairMojibakeText(entry.title) : undefined;
            const parts = toStoryParts(entry.parts);
            if (!parts.length) return null;
            return { id, title, parts };
        })
        .filter(Boolean) as StorySeason[];
    return seasons.length > 0 ? seasons : undefined;
};

const toLegacyMetaParts = (storyParts: StoryPart[], includeContent: boolean): StoryPart[] =>
    storyParts
        .map((part) => {
            const title = typeof part?.title === 'string' ? part.title.trim() : '';
            const slug = typeof part?.slug === 'string' ? part.slug.trim() : '';
            const id = typeof part?.id === 'string' ? part.id : undefined;
            const content = includeContent
                ? (typeof part?.content === 'string' ? part.content : '')
                : '';

            if (!title && !slug && !content) {
                return null;
            }

            return {
                id,
                title,
                slug: slug || undefined,
                content
            };
        })
        .filter(Boolean) as StoryPart[];

const buildLegacyStoryMeta = (story: Story): LegacyStoryMeta => {
    const normalizedStatus = toStoryStatus(story.status);
    const storyParts = Array.isArray(story.parts) ? story.parts : [];
    const normalizedCategories = normalizeCategoryList(
        story.categories,
        [story.category || story.categoryId || '']
    );
    const shouldEmbedFullPartContent = unsupportedStoryColumns.has('parts');
    const legacyParts = storyParts.length > 1
        ? toLegacyMetaParts(storyParts, shouldEmbedFullPartContent)
        : storyParts.length === 1 && storyParts[0]?.title?.trim()
            ? toLegacyMetaParts([storyParts[0]], false)
            : undefined;
    return {
        status: normalizedStatus,
        submittedBy: story.submittedBy || undefined,
        author: story.author || undefined,
        category: normalizedCategories[0] || story.category || story.categoryId || undefined,
        categories: normalizedCategories.length ? normalizedCategories : undefined,
        coverImage: story.cover_image || story.image || undefined,
        slug: story.slug || undefined,
        tags: story.tags?.length ? story.tags : undefined,
        parts: legacyParts,
        comments: typeof story.comments === 'number' ? story.comments : undefined,
        isFeatured: typeof story.is_featured === 'boolean' ? story.is_featured : undefined,
        readTime: story.readTime || undefined,
        season: normalizeSeasonValue(story.season)
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
        return { excerpt: repairMojibakeText(value), meta: null };
    }

    const markerEndIndex = value.indexOf(LEGACY_META_END);
    if (markerEndIndex < 0) {
        return { excerpt: repairMojibakeText(value), meta: null };
    }

    const rawMeta = value.slice(LEGACY_META_START.length, markerEndIndex);
    try {
        const parsed = JSON.parse(rawMeta) as unknown;
        if (!isRecord(parsed)) {
            return { excerpt: repairMojibakeText(value), meta: null };
        }
        const meta: LegacyStoryMeta = {
            status: normalizeStoryStatus(typeof parsed.status === 'string' ? parsed.status : undefined),
            submittedBy: typeof parsed.submittedBy === 'string' ? repairMojibakeText(parsed.submittedBy) : undefined,
            author: typeof parsed.author === 'string' ? repairMojibakeText(parsed.author) : undefined,
            category: typeof parsed.category === 'string' ? repairMojibakeText(parsed.category) : undefined,
            categories: normalizeCategoryList(
                parsed.categories,
                [typeof parsed.category === 'string' ? parsed.category : '']
            ),
            coverImage: typeof parsed.coverImage === 'string' ? repairMojibakeText(parsed.coverImage) : undefined,
            slug: typeof parsed.slug === 'string' ? repairMojibakeText(parsed.slug) : undefined,
            tags: toStringArray(parsed.tags),
            parts: toStoryParts(parsed.parts),
            comments: typeof parsed.comments === 'number' ? parsed.comments : undefined,
            isFeatured: typeof parsed.isFeatured === 'boolean' ? parsed.isFeatured : undefined,
            readTime: typeof parsed.readTime === 'string' ? repairMojibakeText(parsed.readTime) : undefined,
            season: normalizeSeasonValue(parsed.season)
        };
        return {
            excerpt: repairMojibakeText(value.slice(markerEndIndex + LEGACY_META_END.length)),
            meta
        };
    } catch (error) {
        console.warn('Failed to parse legacy story metadata from excerpt', error);
        return { excerpt: repairMojibakeText(value), meta: null };
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

const isSupabaseDisabledError = (error: unknown) => {
    const candidate = error as SupabaseErrorLike | null;
    return Boolean(
        candidate
        && (candidate.code === 'SUPABASE_DISABLED' || candidate.code === 'STORAGE_DISABLED')
    );
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
    const title = repairMojibakeText(row.title ?? '');
    const content = repairMojibakeText(row.content ?? '');
    const rowTags = toStringArray(row.tags);
    const rowParts = toStoryParts(row.parts);
    const fallbackParts = content
        ? [{ id: `${row.id}-part-1`, title: '01', content }]
        : [];
    const legacyMeta = parsedExcerpt.meta;
    const rawLegacyParts = legacyMeta?.parts?.length ? legacyMeta.parts : [];
    const legacyParts = rawLegacyParts.length === 1 && !rawLegacyParts[0].content && content
        ? [{ ...rawLegacyParts[0], content }]
        : rawLegacyParts;
    const parts = rowParts.length ? rowParts : (legacyParts.length ? legacyParts : fallbackParts);
    const resolvedSlug = (row.slug ?? legacyMeta?.slug ?? '').trim();
    const slugValue = slugify(resolvedSlug) || slugify(title);
    const resolvedCategories = normalizeCategoryList(
        legacyMeta?.categories,
        [row.category ?? row.category_id ?? legacyMeta?.category ?? '']
    );
    const primaryCategory = resolvedCategories[0]
        || repairMojibakeText(row.category ?? row.category_id ?? legacyMeta?.category ?? '');

    return {
        id: row.id,
        title,
        excerpt: parsedExcerpt.excerpt,
        content,
        authorId: row.author_id ?? '',
        categoryId: row.category_id ?? primaryCategory,
        views: row.views ?? 0,
        image: row.image ?? row.cover_image ?? legacyMeta?.coverImage ?? undefined,
        date: row.date ?? row.created_at ?? new Date().toISOString(),
        slug: slugValue || undefined,
        author: repairMojibakeText(row.author ?? legacyMeta?.author ?? ''),
        category: primaryCategory,
        categories: resolvedCategories,
        cover_image: row.cover_image ?? legacyMeta?.coverImage ?? undefined,
        tags: rowTags.length ? rowTags : (legacyMeta?.tags ?? []),
        parts,
        seasons: toStorySeasons(row.seasons),
        comments: row.comments ?? legacyMeta?.comments ?? 0,
        is_featured: row.is_featured ?? legacyMeta?.isFeatured ?? false,
        readTime: row.read_time ?? legacyMeta?.readTime ?? undefined,
        season: normalizeSeasonValue(row.season ?? legacyMeta?.season) || 1,
        status: toStoryStatus(row.status ?? legacyMeta?.status),
        submittedBy: row.submitted_by ?? legacyMeta?.submittedBy ?? undefined,
        updatedAt: row.updated_at ?? undefined
    };
};

const mapStoryToRow = (story: Story): Record<string, unknown> => {
    const normalizedStory = normalizeStory(story);
    const meta = buildLegacyStoryMeta(normalizedStory);
    // Avoid duplicating full first-part content when `parts` already carries content.
    // This keeps story row payload significantly smaller for multi-part stories.
    const lightweightLegacyContent = normalizedStory.parts?.length
        ? ''
        : (normalizedStory.content ?? '');
    const primaryCategory = normalizedStory.categories?.[0] || normalizedStory.category || normalizedStory.categoryId || '';

    return {
        id: normalizedStory.id,
        title: normalizedStory.title,
        excerpt: encodeExcerptWithMeta(normalizedStory.excerpt ?? '', meta),
        content: lightweightLegacyContent,
        author_id: normalizedStory.authorId ?? '',
        author: normalizedStory.author ?? null,
        category_id: primaryCategory,
        category: primaryCategory || null,
        views: normalizedStory.views ?? 0,
        image: normalizedStory.image ?? null,
        cover_image: normalizedStory.cover_image ?? null,
        slug: normalizedStory.slug ?? null,
        tags: normalizedStory.tags ?? [],
        parts: normalizedStory.parts ?? [],
        seasons: normalizedStory.seasons ?? null,
        comments: normalizedStory.comments ?? 0,
        is_featured: normalizedStory.is_featured ?? false,
        read_time: normalizedStory.readTime ?? null,
        season: normalizeSeasonValue(normalizedStory.season) ?? 1,
        status: toStoryStatus(normalizedStory.status),
        submitted_by: normalizedStory.submittedBy ?? null,
        date: normalizedStory.date ?? new Date().toISOString(),
        updated_at: normalizedStory.updatedAt ?? new Date().toISOString()
    };
};

const normalizeStorySecurityKey = (value: unknown) => String(value ?? '').trim().toLowerCase();

const storyMatchesBlockedPattern = (story: Partial<Story>) => {
    const title = normalizeStorySecurityKey(story.title);
    const author = normalizeStorySecurityKey(story.author);
    const slug = normalizeStorySecurityKey(story.slug);
    return BLOCKED_STORY_TEXT_PATTERNS.some((pattern) =>
        title.includes(pattern) || author.includes(pattern) || slug.includes(pattern)
    );
};

const isBlockedStoryRecord = (story: Partial<Story>) =>
    BLOCKED_STORY_SUBMITTER_IDS.has(normalizeStorySecurityKey(story.submittedBy))
    || storyMatchesBlockedPattern(story);

const sanitizeStorySecurity = (stories: Story[]) =>
    stories.filter((story) => !isBlockedStoryRecord(story));

const normalizeStory = (story: Story): Story => {
    const normalizedCategories = normalizeCategoryList(
        story.categories,
        [story.category ?? story.categoryId ?? '']
    );
    const primaryCategory = normalizedCategories[0]
        || repairMojibakeText(story.category ?? story.categoryId ?? '');
    const normalizedSlug = slugify(story.slug || '') || slugify(story.title || '');

    return {
        ...story,
        title: repairMojibakeText(story.title ?? ''),
        excerpt: repairMojibakeText(story.excerpt ?? ''),
        content: repairMojibakeText(story.content ?? ''),
        slug: normalizedSlug || undefined,
        views: story.views ?? 0,
        comments: story.comments ?? 0,
        status: toStoryStatus(story.status),
        date: story.date ?? new Date().toISOString(),
        season: normalizeSeasonValue(story.season) ?? 1,
        categoryId: primaryCategory,
        category: primaryCategory,
        categories: normalizedCategories,
        authorId: story.authorId ?? story.submittedBy ?? '',
        author: repairMojibakeText(story.author ?? story.submittedBy ?? ''),
        tags: toStringArray(story.tags),
        parts: toStoryParts(story.parts),
        seasons: toStorySeasons(story.seasons),
        updatedAt: story.updatedAt
    };
};

const sortStoriesByDate = (stories: Story[]) =>
    [...stories].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const normalizeDeletedStoryId = (value: unknown) => String(value ?? '').trim().toLowerCase();
const normalizeStoryLookupValue = (value: unknown) => String(value ?? '').trim().toLowerCase();
const buildStoryLookupAliases = (value: unknown) => {
    const normalized = normalizeStoryLookupValue(value);
    if (!normalized) return [];

    const aliases = new Set<string>([normalized]);
    const stripped = stripLegacyStorySlugSuffix(normalized);
    if (stripped) aliases.add(stripped);
    return Array.from(aliases);
};

const isPublishedStory = (story?: Partial<Story> | null) =>
    toStoryStatus(typeof story?.status === 'string' ? story.status : undefined) === 'published';
const isLegacySeededStory = (story?: Partial<Story> | null) =>
    LEGACY_SEEDED_STORY_IDS.has(String(story?.id ?? '').trim());

const hasReadableStoryContent = (story?: Partial<Story> | null) => {
    if (!story) return false;
    if (hasMeaningfulStoryText(typeof story.content === 'string' ? story.content : '')) {
        return true;
    }

    const parts = Array.isArray(story.parts) ? story.parts : [];
    return parts.some((part) => hasMeaningfulStoryText(typeof part?.content === 'string' ? part.content : ''));
};

const storyMatchesLookup = (story: Story, lookup: string) => {
    const needles = buildStoryLookupAliases(lookup);
    if (!needles.length) return false;

    const storyId = normalizeStoryLookupValue(story.id);
    const storySlug = normalizeStoryLookupValue(story.slug);
    const storySlugWithoutLegacySuffix = stripLegacyStorySlugSuffix(storySlug);

    return needles.some((needle) =>
        storyId === needle
        || storySlug === needle
        || storySlugWithoutLegacySuffix === needle
    );
};

const findBestMatchingStory = (
    stories: Story[],
    storyId?: string,
    options?: { requireContent?: boolean; publishedOnly?: boolean }
) => {
    const needle = String(storyId || '').trim();
    if (!needle) return null;

    const candidates = stories
        .map((story) => normalizeStory(story))
        .filter((story) => storyMatchesLookup(story, needle))
        .filter((story) => (options?.publishedOnly ? isPublishedStory(story) : true))
        .filter((story) => (options?.requireContent ? hasReadableStoryContent(story) : true));

    if (!candidates.length) {
        return null;
    }

    return candidates.reduce((best, candidate) => pickPreferredStory(best, candidate));
};

const filterDeletedStories = async (stories: Story[]) => {
    const deletedItems = await getTrashItemsByType('story');
    if (!deletedItems.length) return stories;

    const deletedIds = new Set(
        deletedItems
            .map((item) => normalizeDeletedStoryId(item.originalId))
            .filter(Boolean)
    );

    if (!deletedIds.size) return stories;
    return stories.filter((story) => !deletedIds.has(normalizeDeletedStoryId(story.id)));
};

const readDeletedStoryIdsFromLocalTrash = () => {
    const ids = new Set<string>();
    if (typeof window === 'undefined') return ids;

    const stored = localStorage.getItem('mahean_trash');
    if (!stored) return ids;

    try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) return ids;

        parsed.forEach((entry) => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
            const record = entry as Record<string, unknown>;
            if (record.type !== 'story') return;

            const normalizedId = normalizeDeletedStoryId(record.originalId ?? record.original_id);
            if (normalizedId) {
                ids.add(normalizedId);
            }
        });
    } catch {
        return ids;
    }

    return ids;
};

const filterDeletedStoriesSync = (stories: Story[]) => {
    const deletedIds = readDeletedStoryIdsFromLocalTrash();
    if (!deletedIds.size) return stories;
    return stories.filter((story) => !deletedIds.has(normalizeDeletedStoryId(story.id)));
};

let inMemoryStoriesCache: Story[] = [];

const storeStories = (stories: Story[]) => {
    inMemoryStoriesCache = stories.map((story) => normalizeStory(story));
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryStoriesCache));
    } catch (error) {
        console.warn('Failed to persist stories in localStorage; using memory cache.', error);
    }
};

const toPublicCacheStoryLite = (story: Story): Story => {
    const normalizedParts = Array.isArray(story.parts)
        ? story.parts.map((part) => ({
            id: part?.id,
            title: part?.title || '',
            slug: part?.slug,
            content: ''
        }))
        : [];

    return {
        ...story,
        content: '',
        parts: normalizedParts
    };
};

const getPublicCacheMode = () => {
    if (typeof window === 'undefined') return 'full';
    const value = String(localStorage.getItem(PUBLIC_CACHE_MODE_KEY) || '').trim().toLowerCase();
    return value === 'lite' ? 'lite' : 'full';
};

const setPublicCacheMode = (mode: 'full' | 'lite') => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PUBLIC_CACHE_MODE_KEY, mode);
};

const storePublicStories = (stories: Story[]) => {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify(stories);

    try {
        localStorage.setItem(PUBLIC_STORAGE_KEY, payload);
        setPublicCacheMode('full');
        return;
    } catch (error) {
        const isQuotaError = error instanceof DOMException && (
            error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        );

        if (!isQuotaError) {
            throw error;
        }
    }

    const liteStories = stories.map((story) => toPublicCacheStoryLite(story));
    try {
        localStorage.setItem(PUBLIC_STORAGE_KEY, JSON.stringify(liteStories));
        setPublicCacheMode('lite');
    } catch {
        localStorage.removeItem(PUBLIC_STORAGE_KEY);
        localStorage.removeItem(PUBLIC_CACHE_MODE_KEY);
    }
};

const hasReadyRemoteStoryCache = () => {
    if (typeof window === 'undefined') return false;
    if (getPublicCacheMode() !== 'full') {
        return false;
    }
    const storedValue = localStorage.getItem(STORY_REMOTE_CACHE_READY_KEY);
    const rawValue = String(storedValue || '').trim();
    if (!rawValue.startsWith(`${STORY_REMOTE_CACHE_VERSION}:`)) {
        return false;
    }

    const syncedAt = Number.parseInt(rawValue.slice(STORY_REMOTE_CACHE_VERSION.length + 1), 10);
    if (!Number.isFinite(syncedAt) || syncedAt <= 0) {
        return false;
    }
    return (Date.now() - syncedAt) < STORY_REMOTE_CACHE_FRESH_MS;
};

const markRemoteStoryCacheReady = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORY_REMOTE_CACHE_READY_KEY, `${STORY_REMOTE_CACHE_VERSION}:${Date.now()}`);
};

const invalidateRemoteStoryCacheReady = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORY_REMOTE_CACHE_READY_KEY);
};

const clearPublicStoryCache = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PUBLIC_STORAGE_KEY);
    localStorage.removeItem(PUBLIC_CACHE_MODE_KEY);
    invalidateRemoteStoryCacheReady();
};

// Internal helper to get raw list
const getRawStories = (): Story[] => {
    if (inMemoryStoriesCache.length) {
        return inMemoryStoriesCache;
    }
    if (typeof window === 'undefined') return [];
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to read stories from localStorage; using memory cache.', error);
        return inMemoryStoriesCache;
    }
    if (!stored) {
        invalidateRemoteStoryCacheReady();
        return [];

        // Legacy sample data kept below is intentionally unreachable and
        // removed by production minification, ensuring it does not rehydrate.
        const initialStories: Story[] = [
            {
                id: '1',
                title: 'পুরানো সেই দিনের কথা', // Rabindranath
                excerpt: 'অতীতের স্মৃতিচারণ আর হারানো দিনের গল্প...',
                content: 'অনেক দিন আগের কথা, যখন সময়টা ছিল বড্ড ধীরগতির...',
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
                excerpt: 'রানুর স্বপ্নের মধ্যে কি সত্যিই কোনো রহস্য লুকিয়ে আছে?',
                content: 'রানুকে আমি প্রথম দেখি যখন তার বয়স দশ...',
                authorId: '2',
                categoryId: 'thriller',
                views: 3400,
                date: new Date(Date.now() - 86400000).toISOString(),
                author: 'হুমায়ূন আহমেদ',
                category: 'মিসির আলি',
                image: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a',
                tags: ['রহস্য', 'মনস্তাত্ত্বিক', 'থ্রিলার'],
                is_featured: true,
                status: 'published'
            },
            {
                id: '3',
                title: 'নীলোপল', // Sunil
                excerpt: 'কাকাবাবু কি পারবেন নীল বিদ্রোহের রহস্য ভেদ করতে?',
                content: 'পাহাড়ের উপর থেকে নিচের খাদটা দেখা যাচ্ছে...',
                authorId: '3',
                categoryId: 'adventure',
                views: 2100,
                date: new Date(Date.now() - 172800000).toISOString(),
                author: 'সুনীল গঙ্গোপাধ্যায়',
                category: 'অ্যাডভেঞ্চার',
                image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
                tags: ['অ্যাডভেঞ্চার', 'রোমাঞ্চ', 'ভ্রমণ'],
                status: 'published'
            },
            {
                id: '4',
                title: 'মহেশ', // Sarat Chandra
                excerpt: 'গফুর আর তার প্রিয় ষাঁড় মহেশের এক করুণ কাহিনী।',
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
                content: 'ফেলুদা বললেন, তোপসে তৈরী হয়ে নে...',
                authorId: '5',
                categoryId: 'mystery',
                views: 4500,
                date: new Date(Date.now() - 345600000).toISOString(),
                author: 'সত্যজিৎ রায়',
                category: 'গোয়েন্দা',
                image: 'https://images.unsplash.com/photo-1476900966873-12c82823b10b',
                tags: ['গোয়েন্দা', 'রহস্য', 'অভিযান'],
                is_featured: true,
                status: 'published'
            },
            {
                id: '6',
                title: 'পথের পাঁচালী', // Bibhutibhushan
                excerpt: 'অপু আর দুর্গার শৈশব, গ্রামীণ বাংলার এক শাশ্বত চিত্র।',
                content: 'হরিহর রায়ের আদি নিবাস ছিল যশোহর জেলার...',
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
                title: 'ভূতুড়ে ঘড়ি', // Shirshendu
                excerpt: 'পুরানো বাড়ির চিলেকোঠায় পাওয়া অদ্ভুত এক ঘড়ির গল্প।',
                content: 'ঘড়িটা যখন দম দিলাম, তখন রাত বারোটা...',
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
                excerpt: 'পথিক, তুমি কি পথ হারাইয়াছ?',
                content: 'নবকুমার যখন বনমধ্যে প্রবেশ করিলেন...',
                authorId: '9',
                categoryId: 'romance',
                views: 1950,
                date: new Date(Date.now() - 691200000).toISOString(),
                author: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়',
                category: 'রোমান্টিক',
                image: 'https://images.unsplash.com/photo-1518893494013-481c1d8ed3fd',
                tags: ['উপন্যাস', 'রোমান্টিক', 'ক্লাসিক'],
                status: 'published'
            },
            {
                id: '10',
                title: 'অশরীরের ছায়া', // Mahean
                excerpt: 'এক ঝড়ের রাতে রেডিও স্টেশনে ঘটে যাওয়া অদ্ভুত ঘটনা।',
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
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore localStorage cleanup failures.
            }
            invalidateRemoteStoryCacheReady();
            return [];
        }

        const normalized = parsed.map((story) => normalizeStory(story as Story));
        const sanitized = sanitizeStorySecurity(
            normalized.filter((story) => !LEGACY_SEEDED_STORY_IDS.has(String(story.id || '').trim()))
        );
        inMemoryStoriesCache = sanitized;
        if (sanitized.length !== normalized.length) {
            storeStories(sanitized);
        }
        return sanitized;
    } catch (error) {
        console.warn('Failed to parse local stories cache; resetting.', error);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore localStorage cleanup failures.
        }
        invalidateRemoteStoryCacheReady();
        return inMemoryStoriesCache;
    }
};

const getRawPublicStories = (): Story[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(PUBLIC_STORAGE_KEY);
    if (!stored) {
        invalidateRemoteStoryCacheReady();
        return [];
    }

    try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
            clearPublicStoryCache();
            return [];
        }

        const normalized = parsed.map((story) => normalizeStory(story as Story));
        const sanitized = sanitizeStorySecurity(
            normalized.filter((story) => !LEGACY_SEEDED_STORY_IDS.has(String(story.id || '').trim()))
        );
        if (sanitized.length !== normalized.length) {
            storePublicStories(sanitized);
        }
        return sanitized;
    } catch (error) {
        console.warn('Failed to parse public stories cache; resetting.', error);
        clearPublicStoryCache();
        return [];
    }
};

const getRawStoryDetails = (): Story[] => {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(PUBLIC_DETAIL_STORAGE_KEY);
    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
            localStorage.removeItem(PUBLIC_DETAIL_STORAGE_KEY);
            return [];
        }

        const normalized = parsed
            .filter((entry): entry is Story => Boolean(entry && typeof entry === 'object'))
            .map((story) => normalizeStory(story))
            .filter((story) => isPublishedStory(story) && hasReadableStoryContent(story));

        return mergeStories(normalized, []).slice(0, PUBLIC_DETAIL_CACHE_LIMIT);
    } catch (error) {
        console.warn('Failed to parse story detail cache; resetting.', error);
        localStorage.removeItem(PUBLIC_DETAIL_STORAGE_KEY);
        return [];
    }
};

const writeStoryDetailCache = (stories: Story[]) => {
    if (typeof window === 'undefined') return;

    const nextStories = mergeStories(
        stories
            .map((story) => normalizeStory(story))
            .filter((story) => isPublishedStory(story) && hasReadableStoryContent(story)),
        []
    ).slice(0, PUBLIC_DETAIL_CACHE_LIMIT);

    if (!nextStories.length) {
        localStorage.removeItem(PUBLIC_DETAIL_STORAGE_KEY);
        return;
    }

    try {
        localStorage.setItem(PUBLIC_DETAIL_STORAGE_KEY, JSON.stringify(nextStories));
    } catch (error) {
        console.warn('Failed to persist story detail cache; continuing without it.', error);
    }
};

const storeStoryDetail = (story: Story) => {
    if (typeof window === 'undefined') return;

    const normalized = normalizeStory(story);
    if (!isPublishedStory(normalized) || !hasReadableStoryContent(normalized)) {
        return;
    }

    const existing = getRawStoryDetails();
    writeStoryDetailCache([normalized, ...existing]);
};

const getLocalVisibleStoriesSync = (stories: Story[]) =>
    filterDeletedStoriesSync(sortStoriesByDate(stories.map(normalizeStory)));

export const getCachedStories = (): Story[] =>
    getLocalPublishedStoriesSnapshot();

export const getCachedAllStories = (): Story[] =>
    getLocalVisibleStoriesSync(getRawStories());

const getLocalVisibleStories = async (stories: Story[]) =>
    filterDeletedStories(sortStoriesByDate(stories.map(normalizeStory)));

const filterPublishedStories = (stories: Story[]) =>
    stories.filter((story) =>
        (story.status ?? 'published') === 'published'
        && !isLegacySeededStory(story)
    );

const syncPublicStoryCacheFromStories = (stories: Story[]) => {
    const publishedStories = filterPublishedStories(getLocalVisibleStoriesSync(stories));
    if (!publishedStories.length) {
        clearPublicStoryCache();
        return [];
    }

    storePublicStories(publishedStories);
    markRemoteStoryCacheReady();
    return publishedStories;
};

const getLocalPublishedStoriesSnapshot = () => {
    const publicStories = filterPublishedStories(getLocalVisibleStoriesSync(getRawPublicStories()));
    const localStories = filterPublishedStories(getLocalVisibleStoriesSync(getRawStories()));

    if (publicStories.length) {
        // Public cache is synced from remote and should be source-of-truth for published stories.
        return publicStories;
    }

    if (!localStories.length) {
        return [];
    }

    return syncPublicStoryCacheFromStories(localStories);
};

const fetchStoriesFromRemote = async () => {
    const { data, error } = await supabase
        .from(STORY_TABLE)
        .select(STORY_LIST_COLUMNS)
        .order('date', { ascending: false });

    if (error) throw error;

    const remoteStories = ((data || []) as StoryRow[]).map(mapRowToStory);
    const visibleStories = await filterDeletedStories(sortStoriesByDate(remoteStories.map(normalizeStory)));
    const publishedStories = filterPublishedStories(visibleStories);
    storePublicStories(publishedStories);
    markRemoteStoryCacheReady();
    return publishedStories;
};

const queueStorySync = (fallbackStories: Story[], options?: { force?: boolean }) => {
    const shouldForce = options?.force ?? false;
    const shouldSync = shouldForce || (Date.now() - lastStorySyncAt) >= STORY_REMOTE_SYNC_TTL_MS;

    if (!storySyncPromise && shouldSync) {
        storySyncPromise = fetchStoriesFromRemote()
            .catch(async (error) => {
                console.warn('Supabase stories fetch failed', error);
                const latestLocalStories = getRawPublicStories();
                const localStories = latestLocalStories.length ? latestLocalStories : fallbackStories;
                return getLocalVisibleStories(localStories);
            })
            .finally(() => {
                lastStorySyncAt = Date.now();
                storySyncPromise = null;
            });
    }

    return storySyncPromise;
};

// Public facing - only published
export const getStories = async (): Promise<Story[]> => {
    const localStories = getRawPublicStories();
    const localPublishedStories = getLocalPublishedStoriesSnapshot();
    // Always await fresh data from remote — never return stale cached stories
    const syncedStories = await queueStorySync(
        localStories.length ? localStories : localPublishedStories,
        { force: true }
    );
    return filterPublishedStories(syncedStories ?? localPublishedStories);
};

export const getCachedStoryByIdOrSlug = (
    storyId?: string,
    options?: { requireContent?: boolean }
): Story | null => {
    const localPublishedStories = getLocalPublishedStoriesSnapshot();
    const cachedCandidates = [
        getRawStoryDetails(),
        localPublishedStories
    ];

    let resolved: Story | null = null;
    cachedCandidates.forEach((stories) => {
        const match = findBestMatchingStory(stories, storyId, {
            requireContent: options?.requireContent,
            publishedOnly: true
        });

        if (!match) {
            return;
        }

        resolved = resolved ? pickPreferredStory(resolved, match) : match;
    });

    return resolved ? normalizeStory(resolved) : null;
};

const fetchStoryByIdOrSlugFromRemote = async (storyId: string) => {
    const needle = String(storyId || '').trim();
    if (!needle) {
        return null;
    }

    const toVisibleStory = async (row?: StoryRow | null) => {
        if (!row) return null;
        const normalizedStory = normalizeStory(mapRowToStory(row));
        const cleanedSlug = stripLegacyStorySlugSuffix(normalizedStory.slug || '');
        const storyWithCleanSlug = cleanedSlug
            ? { ...normalizedStory, slug: cleanedSlug }
            : normalizedStory;
        const visibleStories = await filterDeletedStories([storyWithCleanSlug]);
        return visibleStories[0] || null;
    };

    const idAliases = new Set<string>([normalizeStoryLookupValue(needle)]);
    buildStoryLookupAliases(needle).forEach((alias) => idAliases.add(alias));
    for (const idAlias of idAliases) {
        if (!idAlias) continue;
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(STORY_DETAIL_COLUMNS)
            .eq('id', idAlias)
            .maybeSingle();

        if (error) {
            throw error;
        }

        const visibleStory = await toVisibleStory(data as StoryRow | null);
        if (visibleStory) return visibleStory;
    }

    const slugAliases = buildStoryLookupAliases(needle);
    for (const slugAlias of slugAliases) {
        if (!slugAlias) continue;
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(STORY_DETAIL_COLUMNS)
            .eq('slug', slugAlias)
            .maybeSingle();

        if (error) {
            throw error;
        }

        const visibleStory = await toVisibleStory(data as StoryRow | null);
        if (visibleStory) return visibleStory;
    }

    const canonicalSlug = stripLegacyStorySlugSuffix(needle);
    if (canonicalSlug) {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(STORY_LIST_COLUMNS)
            .order('date', { ascending: false })
            .limit(200);

        if (error) {
            throw error;
        }

        const matchedStories = ((data || []) as StoryRow[])
            .map((row) => normalizeStory(mapRowToStory(row)))
            .filter((story) => {
                const storySlug = normalizeStoryLookupValue(story.slug);
                if (!storySlug.startsWith(`${canonicalSlug}-`)) {
                    return false;
                }
                return stripLegacyStorySlugSuffix(story.slug || '') === canonicalSlug;
            });
        if (matchedStories.length) {
            const visibleStories = await filterDeletedStories(matchedStories);
            if (visibleStories.length) {
                const preferredStory = visibleStories.reduce((best, candidate) => pickPreferredStory(best, candidate));
                return {
                    ...preferredStory,
                    slug: canonicalSlug
                };
            }
        }
    }

    return null;
};

export const getPublishedStoryByIdOrSlug = async (storyId?: string): Promise<Story | null> => {
    const needle = String(storyId || '').trim();
    if (!needle) {
        return null;
    }

    const cachedStory = getCachedStoryByIdOrSlug(needle, { requireContent: true });
    if (cachedStory) {
        void queueStorySync(getLocalPublishedStoriesSnapshot());
        return cachedStory;
    }

    try {
        const remoteStory = await fetchStoryByIdOrSlugFromRemote(needle);
        if (!remoteStory || !isPublishedStory(remoteStory)) {
            return null;
        }

        storeStoryDetail(remoteStory);
        return normalizeStory(remoteStory);
    } catch (error) {
        console.warn('Supabase published story lookup failed', error);
    }

    return getCachedStoryByIdOrSlug(needle);
};

// Admin facing - all stories
export const getAllStories = async (): Promise<Story[]> => {
    const localStories = getRawStories();
    try {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(STORY_LIST_COLUMNS)
            .order('date', { ascending: false });

        if (error) throw error;

        const stories = ((data || []) as StoryRow[]).map(mapRowToStory);
        const visibleStories = await filterDeletedStories(sortStoriesByDate(sanitizeStorySecurity(stories)));
        storeStories(visibleStories);
        return visibleStories;
    } catch (error) {
        console.warn('Supabase stories fetch failed', error);
        return getLocalVisibleStories(localStories);
    }
};

export const getStoryById = async (id: string): Promise<Story | null> => {
    const deletedIds = new Set(
        (await getTrashItemsByType('story'))
            .map((item) => normalizeDeletedStoryId(item.originalId))
            .filter(Boolean)
    );
    if (deletedIds.has(normalizeDeletedStoryId(id))) {
        return null;
    }

    const localStories = getRawStories();
    let remoteLookupFailed = false;
    try {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(STORY_DETAIL_COLUMNS)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            return mapRowToStory(data as unknown as StoryRow);
        }
        return null;
    } catch (error) {
        console.warn('Supabase story lookup failed', error);
        remoteLookupFailed = true;
    }

    if (!remoteLookupFailed || !hasReadyRemoteStoryCache()) {
        return null;
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
    normalized.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
        stories[existingIndex] = normalized;
    } else {
        stories.unshift(normalized);
    }

    storeStories(stories);
    invalidateRemoteStoryCacheReady();
    syncPublicStoryCacheFromStories(stories);

    try {
        const result = await upsertStoryRowWithColumnFallback(mapStoryToRow(normalized));
        if (result.error) throw result.error;
    } catch (error) {
        if (isSupabaseDisabledError(error)) {
            console.info('Supabase disabled; keeping story in local mode.');
        } else {
            console.warn('Supabase story upsert failed', error);
            storeStories(previousStories);
            syncPublicStoryCacheFromStories(previousStories);
            return {
                success: false,
                synced: false,
                story: normalized,
                message: getSupabaseErrorMessage(error, 'Story save failed on server.')
            };
        }
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
    stories[storyIndex] = normalizeStory({
        ...stories[storyIndex],
        status: nextStatus,
        updatedAt: new Date().toISOString()
    });
    storeStories(stories);
    invalidateRemoteStoryCacheReady();
    syncPublicStoryCacheFromStories(stories);

    try {
        const result = await upsertStoryRowWithColumnFallback(mapStoryToRow(stories[storyIndex]));
        if (result.error) throw result.error;
    } catch (error) {
        if (isSupabaseDisabledError(error)) {
            console.info('Supabase disabled; keeping status update in local mode.');
        } else {
            console.warn('Supabase story status update failed', error);
            stories[storyIndex] = previousStory;
            storeStories(stories);
            syncPublicStoryCacheFromStories(stories);
            return {
                success: false,
                synced: false,
                story: previousStory,
                message: getSupabaseErrorMessage(error, 'Story status update failed on server.')
            };
        }
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

    try {
        const { error } = await supabase
            .from(STORY_TABLE)
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.warn('Story source delete failed after moving to trash', error);
    }

    const filtered = stories.filter(s => s.id !== id);
    storeStories(filtered);
    invalidateRemoteStoryCacheReady();
    syncPublicStoryCacheFromStories(filtered);

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

export type StoryBatchMutationResult = {
    success: boolean;
    synced: boolean;
    affectedCount: number;
    message?: string;
};

export type DeletedTagTrashPayload = {
    tag: string;
    affectedStories: Array<{
        id: string;
        title: string;
        tags: string[];
    }>;
};

export type DeletedStoryPartTrashPayload = {
    storyId: string;
    storyTitle?: string;
    part: StoryPart;
    partIndex?: number;
};

const syncChangedStories = async (changedStories: Story[]) => {
    for (const story of changedStories) {
        const result = await upsertStoryRowWithColumnFallback(mapStoryToRow(story));
        if (result.error) {
            throw result.error;
        }
    }
};

const normalizeTagValue = (value: unknown) => repairMojibakeText(typeof value === 'string' ? value : '').trim();

const normalizeTagList = (value: unknown) => {
    const seen = new Set<string>();
    const output: string[] = [];
    toStringArray(value).forEach((entry) => {
        const key = entry.toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        output.push(entry);
    });
    return output;
};

const parseDeletedTagPayload = (value: unknown): DeletedTagTrashPayload | null => {
    if (!isRecord(value)) return null;

    const tag = normalizeTagValue(value.tag);
    if (!tag) return null;

    const affectedStories = Array.isArray(value.affectedStories)
        ? value.affectedStories
            .map((entry) => {
                if (!isRecord(entry)) return null;
                const id = typeof entry.id === 'string' ? entry.id.trim() : '';
                if (!id) return null;
                return {
                    id,
                    title: repairMojibakeText(typeof entry.title === 'string' ? entry.title : '').trim() || id,
                    tags: normalizeTagList(entry.tags)
                };
            })
            .filter(Boolean) as DeletedTagTrashPayload['affectedStories']
        : [];

    return {
        tag,
        affectedStories
    };
};

const normalizeTrashPartPayload = (value: unknown): StoryPart | null => {
    if (!isRecord(value)) return null;
    const id = typeof value.id === 'string' ? value.id : undefined;
    const title = repairMojibakeText(typeof value.title === 'string' ? value.title : '').trim();
    const content = repairMojibakeText(typeof value.content === 'string' ? value.content : '');
    const slug = repairMojibakeText(typeof value.slug === 'string' ? value.slug : '').trim();

    if (!title && !content) return null;

    return {
        id,
        title: title || '01',
        slug: slug || undefined,
        content
    };
};

const parseDeletedStoryPartPayload = (value: unknown): DeletedStoryPartTrashPayload | null => {
    if (!isRecord(value)) return null;

    const storyId = typeof value.storyId === 'string' ? value.storyId.trim() : '';
    if (!storyId) return null;

    const storyTitle = repairMojibakeText(typeof value.storyTitle === 'string' ? value.storyTitle : '').trim() || undefined;
    const part = normalizeTrashPartPayload(value.part);
    if (!part) return null;

    const parsedIndex = Number(value.partIndex);
    const partIndex = Number.isFinite(parsedIndex) && parsedIndex >= 0 ? Math.floor(parsedIndex) : undefined;

    return {
        storyId,
        storyTitle,
        part,
        partIndex
    };
};

export const deleteTagFromAllStories = async (tag: string): Promise<StoryBatchMutationResult> => {
    const normalizedTag = normalizeTagValue(tag);
    if (!normalizedTag) {
        return {
            success: false,
            synced: false,
            affectedCount: 0,
            message: 'Tag name is required.'
        };
    }

    const currentStories = getRawStories().map(normalizeStory);
    const currentTagKey = normalizedTag.toLowerCase();
    const affectedStories: DeletedTagTrashPayload['affectedStories'] = [];
    const changedStories: Story[] = [];
    const now = new Date().toISOString();

    const nextStories = currentStories.map((story) => {
        const currentTags = normalizeTagList(story.tags);
        const nextTags = currentTags.filter((entry) => entry.toLowerCase() !== currentTagKey);

        if (nextTags.length === currentTags.length) {
            return story;
        }

        affectedStories.push({
            id: story.id,
            title: story.title,
            tags: currentTags
        });

        const updatedStory = normalizeStory({
            ...story,
            tags: nextTags,
            updatedAt: now
        });
        changedStories.push(updatedStory);
        return updatedStory;
    });

    if (!affectedStories.length) {
        return {
            success: true,
            synced: true,
            affectedCount: 0
        };
    }

    storeStories(nextStories);

    try {
        await syncChangedStories(changedStories);
    } catch (error) {
        if (!isSupabaseDisabledError(error)) {
            storeStories(currentStories);
            return {
                success: false,
                synced: false,
                affectedCount: 0,
                message: getSupabaseErrorMessage(error, 'Tag delete failed on server.')
            };
        }
    }

    const payload: DeletedTagTrashPayload = {
        tag: normalizedTag,
        affectedStories
    };

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash(
        'tag',
        `tag-${Date.now().toString(36)}-${slugify(normalizedTag) || 'item'}`,
        payload,
        normalizedTag
    );

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', 'story', `Deleted tag "${normalizedTag}" from ${affectedStories.length} stor${affectedStories.length === 1 ? 'y' : 'ies'}`);

    return {
        success: true,
        synced: true,
        affectedCount: affectedStories.length
    };
};

export const restoreDeletedTag = async (payload: unknown): Promise<StoryBatchMutationResult> => {
    const parsedPayload = parseDeletedTagPayload(payload);
    if (!parsedPayload) {
        return {
            success: false,
            synced: false,
            affectedCount: 0,
            message: 'Invalid deleted tag payload.'
        };
    }

    const currentStories = getRawStories().map(normalizeStory);
    const snapshotByStoryId = new Map(
        parsedPayload.affectedStories.map((entry) => [entry.id, entry])
    );
    const restoreTagKey = parsedPayload.tag.toLowerCase();
    const changedStories: Story[] = [];
    const now = new Date().toISOString();

    const nextStories = currentStories.map((story) => {
        const snapshot = snapshotByStoryId.get(story.id);
        if (!snapshot) return story;

        const currentTags = normalizeTagList(story.tags);
        const hasTag = currentTags.some((entry) => entry.toLowerCase() === restoreTagKey);
        if (hasTag) return story;

        const snapshotTag = snapshot.tags.find((entry) => entry.toLowerCase() === restoreTagKey) || parsedPayload.tag;
        const nextTags = normalizeTagList([...currentTags, snapshotTag]);

        const updatedStory = normalizeStory({
            ...story,
            tags: nextTags,
            updatedAt: now
        });
        changedStories.push(updatedStory);
        return updatedStory;
    });

    if (!changedStories.length) {
        return {
            success: true,
            synced: true,
            affectedCount: 0
        };
    }

    storeStories(nextStories);

    try {
        await syncChangedStories(changedStories);
    } catch (error) {
        if (!isSupabaseDisabledError(error)) {
            storeStories(currentStories);
            return {
                success: false,
                synced: false,
                affectedCount: 0,
                message: getSupabaseErrorMessage(error, 'Tag restore failed on server.')
            };
        }
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('restore', 'story', `Restored tag "${parsedPayload.tag}" to ${changedStories.length} stor${changedStories.length === 1 ? 'y' : 'ies'}`);

    return {
        success: true,
        synced: true,
        affectedCount: changedStories.length
    };
};

export const restoreDeletedStoryPart = async (payload: unknown): Promise<StoryMutationResult> => {
    const parsedPayload = parseDeletedStoryPartPayload(payload);
    if (!parsedPayload) {
        return {
            success: false,
            synced: false,
            message: 'Invalid deleted story part payload.'
        };
    }

    const stories = getRawStories().map(normalizeStory);
    const storyIndex = stories.findIndex((story) => story.id === parsedPayload.storyId);
    if (storyIndex < 0) {
        return {
            success: false,
            synced: false,
            message: 'Original story not found for this part.'
        };
    }

    const story = stories[storyIndex];
    const existingParts = toStoryParts(story.parts);
    const incomingPart = parsedPayload.part;

    const alreadyExists = existingParts.some((part) => {
        if (incomingPart.id && part.id && part.id === incomingPart.id) return true;
        if (incomingPart.slug && part.slug && part.slug === incomingPart.slug) return true;
        return part.title === incomingPart.title && part.content === incomingPart.content;
    });

    if (alreadyExists) {
        return {
            success: true,
            synced: true,
            story
        };
    }

    const insertionIndex = typeof parsedPayload.partIndex === 'number'
        ? Math.min(Math.max(parsedPayload.partIndex, 0), existingParts.length)
        : existingParts.length;
    const nextParts = [...existingParts];
    nextParts.splice(insertionIndex, 0, incomingPart);

    const updatedStory: Story = {
        ...story,
        parts: nextParts,
        content: nextParts[0]?.content || story.content || ''
    };

    const result = await saveStory(updatedStory);
    if (!result.success || !result.synced) {
        return result;
    }

    const { logActivity } = await import('./activityLogManager');
    const partLabel = incomingPart.title || 'Part';
    await logActivity('restore', 'story', `Restored story part "${partLabel}" in "${story.title}"`);

    return result;
};

const normalizeViewCount = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return 0;
    }
    return Math.floor(numeric);
};

const incrementViewsWithRetry = async (id: string, maxAttempts = 5): Promise<number | null> => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const { data: currentRow, error: readError } = await supabase
            .from(STORY_TABLE)
            .select('views')
            .eq('id', id)
            .maybeSingle();
        if (readError) throw readError;

        const currentViews = normalizeViewCount((currentRow as StoryRow | null)?.views);
        const nextViews = currentViews + 1;

        const { error: updateError } = await supabase
            .from(STORY_TABLE)
            .update({ views: nextViews, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('views', currentViews);
        if (updateError) throw updateError;

        const { data: verifiedRow, error: verifyError } = await supabase
            .from(STORY_TABLE)
            .select('views')
            .eq('id', id)
            .maybeSingle();
        if (verifyError) throw verifyError;

        const verifiedViews = normalizeViewCount((verifiedRow as StoryRow | null)?.views);
        if (verifiedViews >= nextViews) {
            return verifiedViews;
        }
    }

    return null;
};

export const incrementViews = async (id: string) => {
    const stories = getRawStories();
    const publicStories = getRawPublicStories();
    const story = stories.find(s => s.id === id);
    const publicStory = publicStories.find(s => s.id === id);
    if (!story && !publicStory) {
        return;
    }

    const baseViews = story || publicStory;
    const optimisticViews = normalizeViewCount(baseViews?.views) + 1;

    if (story) {
        story.views = optimisticViews;
        storeStories(stories);
    }
    if (publicStory) {
        publicStory.views = optimisticViews;
        storePublicStories(publicStories);
    }

    try {
        const syncedViews = await incrementViewsWithRetry(id);
        if (typeof syncedViews === 'number') {
            if (story && syncedViews !== story.views) {
                story.views = syncedViews;
                storeStories(stories);
            }
            if (publicStory && syncedViews !== publicStory.views) {
                publicStory.views = syncedViews;
                storePublicStories(publicStories);
            }
        }
    } catch (error) {
        console.warn('Supabase story views update failed', error);
    }
};
