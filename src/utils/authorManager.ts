import { supabase } from '../lib/supabase';
import { repairMojibakeText } from './textRepair';

export interface Author {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
    username?: string;
    links?: { name: string; url: string; }[];
}

const STORAGE_KEY = 'mahean_authors';
const AUTHOR_TABLE = 'authors';
const TRASH_STORAGE_KEY = 'mahean_trash';
const TRASH_TABLE = 'trash';
const DELETED_AUTHOR_CACHE_TTL_MS = 15_000;

type AuthorRow = {
    id: string;
    name: string;
    bio?: string | null;
    avatar?: string | null;
    username?: string | null;
    links?: unknown;
};

type SupabaseErrorLike = {
    code?: string;
    message?: string;
};

type TrashAuthorRow = {
    original_id?: string | null;
};

const MISSING_COLUMN_REGEX = /Could not find the '([^']+)' column/i;
const unsupportedAuthorColumns = new Set<string>();

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const normalizeKey = (value?: string | null) => (value ?? '').trim().toLowerCase();

const normalizeAuthor = (author: Author): Author => ({
    id: author.id.trim(),
    name: repairMojibakeText(author.name).trim(),
    bio: repairMojibakeText(author.bio || '').trim() || undefined,
    avatar: author.avatar?.trim() || undefined,
    username: repairMojibakeText(author.username || '').trim() || undefined,
    links: toArray<{ name: string; url: string }>(author.links)
        .map((link) => ({
            name: typeof link?.name === 'string' ? repairMojibakeText(link.name).trim() : '',
            url: typeof link?.url === 'string' ? link.url.trim() : ''
        }))
        .filter((link) => Boolean(link.name || link.url))
});

const authorKey = (author: Author) => {
    const idKey = normalizeKey(author.id);
    if (idKey) return `id:${idKey}`;
    const usernameKey = normalizeKey(author.username);
    if (usernameKey) return `username:${usernameKey}`;
    return `name:${normalizeKey(author.name)}`;
};

const extractMissingAuthorColumn = (error: unknown): string | null => {
    const candidate = error as SupabaseErrorLike | null;
    if (!candidate || typeof candidate !== 'object') return null;
    if (candidate.code !== 'PGRST204' || typeof candidate.message !== 'string') return null;
    const match = candidate.message.match(MISSING_COLUMN_REGEX);
    return match?.[1] ?? null;
};

const upsertAuthorRowWithColumnFallback = async (row: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { ...row };
    unsupportedAuthorColumns.forEach((columnName) => {
        delete payload[columnName];
    });

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const { error } = await supabase
            .from(AUTHOR_TABLE)
            .upsert(payload, { onConflict: 'id' });

        if (!error) {
            return { error: null };
        }

        lastError = error;
        const missingColumn = extractMissingAuthorColumn(error);
        if (!missingColumn || !(missingColumn in payload)) {
            break;
        }

        unsupportedAuthorColumns.add(missingColumn);
        delete payload[missingColumn];
    }

    return { error: lastError };
};

const mergeAuthors = (primary: Author[], secondary: Author[]) => {
    const map = new Map<string, Author>();
    primary.forEach(author => {
        const normalized = normalizeAuthor(author);
        map.set(authorKey(normalized), normalized);
    });
    secondary.forEach(author => {
        const normalized = normalizeAuthor(author);
        const key = authorKey(normalized);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, normalized);
            return;
        }
        map.set(key, {
            ...existing,
            bio: existing.bio || normalized.bio,
            avatar: existing.avatar || normalized.avatar,
            username: existing.username || normalized.username,
            links: existing.links?.length ? existing.links : normalized.links
        });
    });
    return Array.from(map.values());
};

const sortAuthors = (authors: Author[]) =>
    [...authors].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn'));

const mapRowToAuthor = (row: AuthorRow): Author =>
    normalizeAuthor({
        id: row.id,
        name: repairMojibakeText(row.name ?? ''),
        bio: repairMojibakeText(row.bio ?? '') || undefined,
        avatar: row.avatar ?? undefined,
        username: repairMojibakeText(row.username ?? '') || undefined,
        links: toArray<{ name: string; url: string }>(row.links)
    });

const mapAuthorToRow = (author: Author) => {
    const normalized = normalizeAuthor(author);
    return {
        id: normalized.id,
        name: normalized.name,
        bio: normalized.bio ?? null,
        avatar: normalized.avatar ?? null,
        username: normalized.username ?? null,
        links: normalized.links ?? []
    };
};

let inMemoryAuthorsCache: Author[] = [];
let hasAttemptedRemoteBackfill = false;
let deletedAuthorIdsCache: { expiresAt: number; ids: Set<string>; } | null = null;

const normalizeId = (value: unknown) => normalizeKey(typeof value === 'string' ? value : String(value ?? ''));

const invalidateDeletedAuthorIdsCache = () => {
    deletedAuthorIdsCache = null;
};

const readDeletedAuthorIdsFromLocalTrash = () => {
    const ids = new Set<string>();
    if (typeof window === 'undefined') return ids;

    let raw: string | null = null;
    try {
        raw = localStorage.getItem(TRASH_STORAGE_KEY);
    } catch {
        return ids;
    }
    if (!raw) return ids;

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return ids;
        parsed.forEach((entry) => {
            if (!entry || typeof entry !== 'object') return;
            const record = entry as Record<string, unknown>;
            if (record.type !== 'author') return;
            const originalId = record.originalId ?? record.original_id ?? null;
            const normalizedId = normalizeId(originalId);
            if (normalizedId) {
                ids.add(normalizedId);
            }
        });
    } catch {
        return ids;
    }

    return ids;
};

const getDeletedAuthorIds = async () => {
    const now = Date.now();
    if (deletedAuthorIdsCache && deletedAuthorIdsCache.expiresAt > now) {
        return deletedAuthorIdsCache.ids;
    }

    const ids = readDeletedAuthorIdsFromLocalTrash();
    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .select('original_id')
            .eq('type', 'author');
        if (error) throw error;
        ((data || []) as TrashAuthorRow[]).forEach((row) => {
            const normalizedId = normalizeId(row.original_id);
            if (normalizedId) {
                ids.add(normalizedId);
            }
        });
    } catch {
        // Ignore remote trash read failures and rely on local trash cache.
    }

    deletedAuthorIdsCache = {
        ids,
        expiresAt: now + DELETED_AUTHOR_CACHE_TTL_MS
    };

    return ids;
};

const filterDeletedAuthors = async (authors: Author[]) => {
    const deletedAuthorIds = await getDeletedAuthorIds();
    if (!deletedAuthorIds.size) return authors;
    return authors.filter((author) => !deletedAuthorIds.has(normalizeId(author.id)));
};

const storeAuthors = (authors: Author[]) => {
    const normalized = sortAuthors(authors.map(normalizeAuthor));
    inMemoryAuthorsCache = normalized;
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
        console.warn('Failed to persist authors in localStorage; using memory cache.', error);
    }
};

const getLocalAuthors = (): Author[] => {
    if (typeof window === 'undefined') return inMemoryAuthorsCache;
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to read authors from localStorage; using memory cache.', error);
        return inMemoryAuthorsCache;
    }
    if (!stored) {
        if (inMemoryAuthorsCache.length > 0) {
            return inMemoryAuthorsCache;
        }
        const initialAuthors: Author[] = [
            {
                id: '1',
                name: 'রবীন্দ্রনাথ ঠাকুর',
                username: 'rabindranath',
                bio: 'বিশ্বকবি এবং নোবেল বিজয়ী সাহিত্যিক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Rabindranath_Tagore_unknown_photographer.jpg/800px-Rabindranath_Tagore_unknown_photographer.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/রবীন্দ্রনাথ_ঠাকুর' }]
            },
            {
                id: '2',
                name: 'হুমায়ূন আহমেদ',
                username: 'humayun',
                bio: 'বাংলা সাহিত্যের অন্যতম জনপ্রিয় কথাশিল্পী ও চলচ্চিত্র নির্মাতা।',
                avatar: 'https://upload.wikimedia.org/wikipedia/en/8/84/Humayun_Ahmed.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/হুমায়ূন_আহমেদ' }]
            },
            {
                id: '3',
                name: 'সুনীল গঙ্গোপাধ্যায়',
                username: 'sunil',
                bio: 'আধুনিক বাংলা কবিতার অন্যতম প্রধান কবি ও ঔপন্যাসিক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Sunil_Gangopadhyay_at_Kolkata_Book_Fair_2009.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/সুনীল_গঙ্গোপাধ্যায়' }]
            },
            {
                id: '4',
                name: 'শরৎচন্দ্র চট্টোপাধ্যায়',
                username: 'sarat',
                bio: 'অজেয় কথাশিল্পী ও বাংলা সাহিত্যের অন্যতম জনপ্রিয় লেখক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Sarat_Chandra_Chattopadhyay.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/শরৎচন্দ্র_চট্টোপাধ্যায়' }]
            },
            {
                id: '5',
                name: 'সত্যজিৎ রায়',
                username: 'satyajit',
                bio: 'বিশ্ববরেণ্য চলচ্চিত্র পরিচালক ও ফেলুদা-প্রফেসর শঙ্কুর স্রষ্টা।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Satyajit_Ray_in_New_York.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/সত্যজিৎ_রায়' }]
            },
            {
                id: '6',
                name: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
                username: 'bibhuti',
                bio: 'প্রকৃতিপ্রেমী লেখক, পথের পাঁচালীর রচয়িতা।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Bibhutibhushan_Bandyopadhyay.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/বিভূতিভূষণ_বন্দ্যোপাধ্যায়' }]
            },
            {
                id: '7',
                name: 'শীর্ষেন্দু মুখোপাধ্যায়',
                username: 'shirshendu',
                bio: 'অদ্ভুতুড়ে ও রোমাঞ্চকর গল্পের জাদুকর।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Shirshendu_Mukhopadhyay_2013.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/শীর্ষেন্দু_মুখোপাধ্যায়' }]
            },
            {
                id: '8',
                name: 'কাজী নজরুল ইসলাম',
                username: 'nazrul',
                bio: 'বিদ্রোহী কবি এবং বাংলাদেশের জাতীয় কবি।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Kazi_Nazrul_Islam.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/কাজী_নজরুল_ইসলাম' }]
            },
            {
                id: '9',
                name: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়',
                username: 'bankim',
                bio: 'বাংলা উপন্যাসের জনক ও সাহিত্যসম্রাট।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Bankim_Chandra_Chattopadhyay.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/বঙ্কিমচন্দ্র_চট্টোপাধ্যায়' }]
            },
            {
                id: '10',
                name: 'মাহিয়ান আহমেদ',
                username: 'mahean',
                bio: 'ভয়েস আর্টিস্ট ও অডিওবুক ক্রিয়েটর।',
                avatar: 'https://mahean.com/mahean-3.jpg',
                links: [
                    { name: 'Facebook', url: 'https://facebook.com/maheanahmed' },
                    { name: 'YouTube', url: 'https://youtube.com/@maheanahmed' }
                ]
            }
        ];
        storeAuthors(initialAuthors);
        return initialAuthors;
    }
    try {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (removeError) {
                console.warn('Failed to clear invalid authors cache.', removeError);
            }
            return getLocalAuthors();
        }
        const normalized = parsed
            .filter((entry): entry is Author => {
                if (!entry || typeof entry !== 'object') return false;
                const maybeAuthor = entry as Partial<Author>;
                return typeof maybeAuthor.id === 'string' && typeof maybeAuthor.name === 'string';
            })
            .map((author) => normalizeAuthor(author));
        inMemoryAuthorsCache = normalized;
        return normalized;
    } catch (error) {
        console.warn('Failed to parse authors cache; resetting.', error);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (removeError) {
            console.warn('Failed to clear invalid authors cache.', removeError);
        }
        return getLocalAuthors();
    }
};

const backfillAuthorsToRemote = async (authors: Author[]) => {
    for (const author of authors) {
        const result = await upsertAuthorRowWithColumnFallback(mapAuthorToRow(author));
        if (result.error) {
            console.warn('Supabase author backfill failed', result.error);
            return false;
        }
    }
    return true;
};

export const getAllAuthors = async (): Promise<Author[]> => {
    const localAuthors = getLocalAuthors();
    try {
        const { data, error } = await supabase
            .from(AUTHOR_TABLE)
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const authors = ((data || []) as AuthorRow[]).map(mapRowToAuthor);

        if (authors.length === 0 && localAuthors.length > 0 && !hasAttemptedRemoteBackfill) {
            hasAttemptedRemoteBackfill = true;
            await backfillAuthorsToRemote(localAuthors);
        }

        const merged = sortAuthors(mergeAuthors(authors.length ? authors : localAuthors, localAuthors));
        const visibleAuthors = await filterDeletedAuthors(merged);
        storeAuthors(visibleAuthors);
        return visibleAuthors;
    } catch (error) {
        console.warn('Supabase authors fetch failed', error);
        return filterDeletedAuthors(localAuthors);
    }
};

export const getAuthorById = async (id: string): Promise<Author | null> => {
    const authors = await getAllAuthors();
    return authors.find(a => a.id === id) || null;
};

export const getAuthorByName = async (name: string): Promise<Author | null> => {
    const authors = await getAllAuthors();
    const needle = normalizeKey(name);
    return authors.find(a => normalizeKey(a.name) === needle || normalizeKey(a.username) === needle) || null;
};

export const saveAuthor = async (author: Author) => {
    const normalizedAuthor = normalizeAuthor(author);
    if (!normalizedAuthor.id || !normalizedAuthor.name) {
        return getLocalAuthors();
    }

    const authors = getLocalAuthors();
    const existingIndex = authors.findIndex((entry) => {
        if (entry.id === normalizedAuthor.id) return true;
        if (normalizedAuthor.username && normalizeKey(entry.username) === normalizeKey(normalizedAuthor.username)) return true;
        return false;
    });

    if (existingIndex >= 0) {
        authors[existingIndex] = normalizedAuthor;
    } else {
        authors.push(normalizedAuthor);
    }

    const nextAuthors = sortAuthors(authors);
    storeAuthors(nextAuthors);

    try {
        const result = await upsertAuthorRowWithColumnFallback(mapAuthorToRow(normalizedAuthor));
        if (result.error) throw result.error;
    } catch (error) {
        console.warn('Supabase author upsert failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    const action = existingIndex >= 0 ? 'update' : 'create';
    await logActivity(action, 'author', `${action === 'create' ? 'Created' : 'Updated'} author: ${normalizedAuthor.name}`);
    return nextAuthors;
};

export const updateAuthor = async (author: Author) => {
    await saveAuthor(author);
};

export const deleteAuthor = async (id: string) => {
    const authors = getLocalAuthors();
    const author = authors.find(a => a.id === id);
    if (!author) return;

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('author', id, author, author.name);
    invalidateDeletedAuthorIdsCache();

    const filtered = authors.filter(a => a.id !== id);
    storeAuthors(filtered);

    try {
        const { error } = await supabase
            .from(AUTHOR_TABLE)
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase author delete failed', error);
    }

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', 'author', `Deleted author: ${author.name}`);
};

export const restoreAuthor = async (author: Author) => {
    invalidateDeletedAuthorIdsCache();
    await saveAuthor(author);
    const { logActivity } = await import('./activityLogManager');
    await logActivity('restore', 'author', `Restored author: ${author.name}`);
};
