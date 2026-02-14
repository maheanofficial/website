import { createClient } from '@supabase/supabase-js';

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const SUPABASE_URL = pickFirstEnv(
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL'
) || 'https://gepywlhveafqosoyitcb.supabase.co';

const SUPABASE_ANON_KEY = pickFirstEnv(
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHl3bGh2ZWFmcW9zb3lpdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODc2OTEsImV4cCI6MjA4NTY2MzY5MX0.Ibn6RPloHkN2VPYMlvYLssecy27DiP6CvXiPvoD_zPA';

const STORY_TABLE = 'stories';
const STORY_SELECT_FALLBACKS = [
    'id, slug, title, excerpt',
    'id, slug, title',
    'id, title, excerpt',
    'id, title'
];

const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';

const parseLegacyMeta = (excerpt) => {
    if (typeof excerpt !== 'string' || !excerpt.startsWith(LEGACY_META_START)) return null;
    const markerEndIndex = excerpt.indexOf(LEGACY_META_END);
    if (markerEndIndex < 0) return null;
    const raw = excerpt.slice(LEGACY_META_START.length, markerEndIndex);
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
};

const slugify = (value) => {
    let text = String(value || '');
    try {
        text = text.normalize('NFKC');
    } catch {
        // ignore
    }

    const normalized = text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    let cleaned = normalized;
    try {
        cleaned = cleaned.replace(/[^\p{L}\p{N}\p{M}-]+/gu, '');
    } catch {
        cleaned = cleaned.replace(/[^\w-]+/g, '');
    }

    return cleaned
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const fetchStoryByIdWithFallback = async (supabase, id) => {
    let lastError = null;
    for (const selectClause of STORY_SELECT_FALLBACKS) {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(selectClause)
            .eq('id', id)
            .maybeSingle();

        if (!error) {
            return data;
        }
        lastError = error;
    }
    throw lastError || new Error('Story lookup failed.');
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
    }

    const baseUrl = `http://${req.headers?.host || 'localhost'}`;
    const url = new URL(req.url || '', baseUrl);
    const id = url.searchParams.get('id')?.trim() || '';
    const partParam = url.searchParams.get('part');
    const partNumber = parsePositiveInt(partParam, 1);

    if (!id) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Missing id.');
        return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Supabase credentials not configured.');
        return;
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        const story = await fetchStoryByIdWithFallback(supabase, id);
        if (!story) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Story not found.');
            return;
        }

        const meta = parseLegacyMeta(story?.excerpt);
        const rawSlug = typeof story.slug === 'string' ? story.slug.trim() : '';
        const metaSlug = typeof meta?.slug === 'string' ? meta.slug.trim() : '';
        const generatedSlug = slugify(typeof story.title === 'string' ? story.title : '');
        const rawId = typeof story.id === 'string' || typeof story.id === 'number'
            ? String(story.id).trim()
            : '';
        const segment = rawSlug || metaSlug || generatedSlug || rawId || id;

        const location = `/stories/${encodeURIComponent(segment)}/part/${partNumber}`;
        res.statusCode = 301;
        res.setHeader('Location', location);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        res.end();
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`Redirect failed. ${(error && error.message) ? error.message : ''}`.trim());
    }
}
