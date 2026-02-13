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

const normalizeBaseUrl = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withProtocol.replace(/\/+$/, '');
};

const SITE_URL = normalizeBaseUrl(
    pickFirstEnv('SITE_URL', 'VITE_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL')
) || 'https://mahean.com';

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
const PUBLIC_STATUSES = new Set(['published', 'completed', 'ongoing']);
const STORY_SELECT_FALLBACKS = [
    'id, slug, status, date, updated_at',
    'id, status, date, updated_at',
    'id, date, updated_at',
    'id'
];
const TODAY = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/stories', changefreq: 'daily', priority: '0.9' },
    { path: '/series', changefreq: 'weekly', priority: '0.8' },
    { path: '/authors', changefreq: 'weekly', priority: '0.8' },
    { path: '/categories', changefreq: 'weekly', priority: '0.7' },
    { path: '/tags', changefreq: 'weekly', priority: '0.7' },
    { path: '/audiobooks', changefreq: 'weekly', priority: '0.8' },
    { path: '/skills', changefreq: 'monthly', priority: '0.7' },
    { path: '/contact', changefreq: 'monthly', priority: '0.6' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
    { path: '/terms', changefreq: 'yearly', priority: '0.4' },
    { path: '/disclaimer', changefreq: 'yearly', priority: '0.4' },
    { path: '/about', changefreq: 'monthly', priority: '0.5' },
    { path: '/links', changefreq: 'monthly', priority: '0.7' }
];

const escapeXml = (value) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toDateOnly = (value) => {
    if (!value || typeof value !== 'string') return TODAY;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return TODAY;
    return new Date(timestamp).toISOString().slice(0, 10);
};

const toStoryPath = (story) => {
    const rawSlug = typeof story.slug === 'string' ? story.slug.trim() : '';
    const rawId = typeof story.id === 'string' || typeof story.id === 'number'
        ? String(story.id).trim()
        : '';
    const segment = rawSlug || rawId;
    if (!segment) return null;
    return `/stories/${encodeURIComponent(segment)}`;
};

const isPublicStory = (story) => {
    const rawStatus = typeof story.status === 'string' ? story.status.trim().toLowerCase() : '';
    if (!rawStatus) return true;
    return PUBLIC_STATUSES.has(rawStatus);
};

const xmlEntry = (entry) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;

const fetchStoriesWithColumnFallback = async (supabase) => {
    let lastError = null;

    for (const selectClause of STORY_SELECT_FALLBACKS) {
        const { data, error } = await supabase
            .from(STORY_TABLE)
            .select(selectClause)
            .limit(5000);

        if (!error) {
            return Array.isArray(data) ? data : [];
        }

        lastError = error;
    }

    if (lastError) {
        throw lastError;
    }

    return [];
};

export default async function handler(req, res) {
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
    }

    const entries = STATIC_ROUTES.map((route) => ({
        ...route,
        lastmod: TODAY
    }));
    const existingPaths = new Set(entries.map((entry) => entry.path));

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const rows = await fetchStoriesWithColumnFallback(supabase);
            rows
                .filter(isPublicStory)
                .forEach((story) => {
                    const path = toStoryPath(story);
                    if (!path || existingPaths.has(path)) return;
                    entries.push({
                        path,
                        lastmod: toDateOnly(story.updated_at || story.date),
                        changefreq: 'weekly',
                        priority: '0.8'
                    });
                    existingPaths.add(path);
                });
        } catch (error) {
            console.warn('Failed to include dynamic story routes in sitemap:', error?.message || error);
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(xmlEntry).join('\n')}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(xml);
}
