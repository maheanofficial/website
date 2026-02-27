import { listRows } from './_table-store.js';

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
    pickFirstEnv('SITE_URL', 'VITE_SITE_URL')
) || 'https://www.mahean.com';

const TODAY = new Date().toISOString().slice(0, 10);
const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';
const MAX_STORIES = Number.parseInt(String(process.env.SITEMAP_MAX_STORIES || ''), 10) || 10000;
const MAX_PARTS_PER_STORY = Number.parseInt(String(process.env.SITEMAP_MAX_PARTS_PER_STORY || ''), 10) || 200;

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

const normalizeUnicode = (value) => {
    try {
        return value.normalize('NFKC');
    } catch {
        return value;
    }
};

const slugify = (value) => {
    const base = normalizeUnicode(String(value ?? ''))
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    let cleaned = base;
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

const escapeXml = (value) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toIsoDate = (value) => {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) return TODAY;
    return parsed.toISOString().slice(0, 10);
};

const parseLegacyMeta = (excerpt) => {
    const value = String(excerpt || '');
    if (!value.startsWith(LEGACY_META_START)) return null;
    const markerEndIndex = value.indexOf(LEGACY_META_END);
    if (markerEndIndex < 0) return null;
    const rawMeta = value.slice(LEGACY_META_START.length, markerEndIndex);
    try {
        const parsed = JSON.parse(rawMeta);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
};

const isPublicStory = (story) => {
    const meta = parseLegacyMeta(story?.excerpt);
    const rawStatus = String(story?.status || meta?.status || '').trim().toLowerCase();
    if (!rawStatus) return true;
    return rawStatus === 'published' || rawStatus === 'completed' || rawStatus === 'ongoing';
};

const toStorySegment = (story) => {
    const meta = parseLegacyMeta(story?.excerpt);
    const rawSlug = typeof story?.slug === 'string' ? story.slug.trim() : '';
    const metaSlug = typeof meta?.slug === 'string' ? meta.slug.trim() : '';
    const generated = slugify(typeof story?.title === 'string' ? story.title : '');
    const fallbackId = String(story?.id || '').trim();
    return rawSlug || metaSlug || generated || fallbackId || null;
};

const toStoryParts = (story) => {
    const meta = parseLegacyMeta(story?.excerpt);
    const fromRow = Array.isArray(story?.parts) ? story.parts : [];
    const fromMeta = Array.isArray(meta?.parts) ? meta.parts : [];
    const candidate = fromRow.length ? fromRow : fromMeta;

    const normalized = candidate
        .map((part) => {
            if (!part || typeof part !== 'object') return null;
            const title = typeof part.title === 'string' ? part.title.trim() : '';
            const slug = typeof part.slug === 'string' ? part.slug.trim() : '';
            const content = typeof part.content === 'string' ? part.content.trim() : '';
            if (!title && !slug && !content) return null;
            return { title, slug, content };
        })
        .filter(Boolean);

    if (normalized.length) return normalized;
    return [{ title: '', slug: '', content: '' }];
};

const toPartSegment = (part, index) => {
    const custom = slugify(typeof part?.slug === 'string' ? part.slug : '');
    const byTitle = slugify(typeof part?.title === 'string' ? part.title : '');
    return custom || byTitle || String(index + 1);
};

const buildFallbackSitemap = () => {
    const entries = STATIC_ROUTES.map((route) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${route.path}`)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
};

const buildDynamicSitemap = async () => {
    const staticEntries = STATIC_ROUTES.map((route) => ({
        path: route.path,
        lastmod: TODAY,
        changefreq: route.changefreq,
        priority: route.priority
    }));

    const seenPaths = new Set(staticEntries.map((entry) => entry.path));
    const dynamicEntries = [];

    try {
        const rows = await listRows('stories', {
            orderBy: { column: 'updated_at', ascending: false }
        });
        const stories = Array.isArray(rows) ? rows : [];

        let includedStories = 0;
        for (const story of stories) {
            if (!isPublicStory(story)) continue;
            const storySegment = toStorySegment(story);
            if (!storySegment) continue;

            includedStories += 1;
            if (includedStories > MAX_STORIES) break;

            const encodedStorySegment = encodeURIComponent(storySegment);
            const lastmod = toIsoDate(story?.updated_at || story?.date || story?.created_at);
            const storyPath = `/stories/${encodedStorySegment}`;

            if (!seenPaths.has(storyPath)) {
                seenPaths.add(storyPath);
                dynamicEntries.push({
                    path: storyPath,
                    lastmod,
                    changefreq: 'daily',
                    priority: '0.9'
                });
            }

            const parts = toStoryParts(story).slice(0, MAX_PARTS_PER_STORY);
            parts.forEach((part, index) => {
                const partSegment = toPartSegment(part, index);
                const partPath = `/stories/${encodedStorySegment}/${encodeURIComponent(partSegment)}`;
                if (seenPaths.has(partPath)) return;
                seenPaths.add(partPath);
                dynamicEntries.push({
                    path: partPath,
                    lastmod,
                    changefreq: 'weekly',
                    priority: '0.8'
                });
            });
        }
    } catch (error) {
        console.warn('[sitemap] Failed to load dynamic story rows:', error);
    }

    const allEntries = [...staticEntries, ...dynamicEntries];
    const xmlEntries = allEntries.map((entry) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries.join('\n')}
</urlset>`;
};

export default async function handler(req, res) {
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
    }

    try {
        const xml = await buildDynamicSitemap();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
        res.end(xml);
    } catch {
        const xml = buildFallbackSitemap();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
        res.end(xml);
    }
}
