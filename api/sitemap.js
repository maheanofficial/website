import { listPublicStoryRows } from './_public-story-rows.js';

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

const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';
const MAX_STORIES = Number.parseInt(String(process.env.SITEMAP_MAX_STORIES || ''), 10) || 10000;
const MAX_PARTS_PER_STORY = Number.parseInt(String(process.env.SITEMAP_MAX_PARTS_PER_STORY || ''), 10) || 200;
const SITEMAP_STORY_COLUMNS = [
    'id',
    'title',
    'excerpt',
    'slug',
    'parts',
    'tags',
    'status',
    'category',
    'category_id',
    'date',
    'created_at',
    'updated_at'
].join(',');

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

const LEGACY_STORY_SLUG_SUFFIX_REGEX = /-\d{5}$/;
const stripLegacyStorySlugSuffix = (value) => {
    const normalized = slugify(value);
    if (!normalized) return '';
    const stripped = normalized.replace(LEGACY_STORY_SLUG_SUFFIX_REGEX, '');
    return stripped || normalized;
};

const escapeXml = (value) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const toIsoDate = (value) => {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) return getTodayDate();
    return parsed.toISOString().slice(0, 10);
};

const normalizeCategoryValue = (value) => String(value ?? '').trim();
const normalizeCategoryKey = (value) => normalizeCategoryValue(value).toLowerCase();
const normalizeTagValue = (value) => String(value ?? '').trim().replace(/^#/, '');
const normalizeTagKey = (value) => normalizeTagValue(value).toLowerCase();
const toUniqueCategoryValues = (values) => {
    const seen = new Set();
    const output = [];

    (Array.isArray(values) ? values : []).forEach((value) => {
        const normalizedValue = normalizeCategoryValue(value);
        const normalizedKey = normalizeCategoryKey(normalizedValue);
        if (!normalizedKey || seen.has(normalizedKey)) return;
        seen.add(normalizedKey);
        output.push(normalizedValue);
    });

    return output;
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
    return stripLegacyStorySlugSuffix(rawSlug || metaSlug || generated) || fallbackId || null;
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

const fetchStoriesFromDbApi = async () => {
    let timeoutId = null;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 8_000);
        const response = await fetch(`${SITE_URL}/api/db`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'stories',
                action: 'select',
                columns: SITEMAP_STORY_COLUMNS,
                orderBy: {
                    column: 'updated_at',
                    ascending: false
                }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        timeoutId = null;
        if (!response.ok) return [];
        const payload = await response.json().catch(() => null);
        return Array.isArray(payload?.data) ? payload.data : [];
    } catch (error) {
        console.warn('[sitemap] Failed to load story rows from /api/db:', error?.message || error);
        return [];
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

const fetchStoryRows = async () => {
    try {
        const rows = await listPublicStoryRows({
            orderBy: { column: 'updated_at', ascending: false }
        });
        const directRows = Array.isArray(rows) ? rows : [];
        if (directRows.length) {
            return directRows;
        }
    } catch (error) {
        console.warn('[sitemap] Failed to load story rows from table store:', error?.message || error);
    }

    return fetchStoriesFromDbApi();
};

const buildFallbackSitemap = () => {
    const today = getTodayDate();
    const entries = STATIC_ROUTES.map((route) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${route.path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
};

const buildDynamicSitemap = async () => {
    const today = getTodayDate();
    const staticEntries = STATIC_ROUTES.map((route) => ({
        path: route.path,
        lastmod: today,
        changefreq: route.changefreq,
        priority: route.priority
    }));

    const seenPaths = new Set(staticEntries.map((entry) => entry.path));
    const dynamicEntries = [];
    const categoryEntries = new Map();
    const tagEntries = new Map();

    try {
        const stories = await fetchStoryRows();

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
            const meta = parseLegacyMeta(story?.excerpt);
            const categoryNames = toUniqueCategoryValues(
                Array.isArray(meta?.categories)
                    ? meta.categories
                    : [story?.category || story?.category_id || meta?.category]
            );
            const rawTags = Array.isArray(story?.tags)
                ? story.tags
                : Array.isArray(meta?.tags)
                    ? meta.tags
                    : [];

            if (!seenPaths.has(storyPath)) {
                seenPaths.add(storyPath);
                dynamicEntries.push({
                    path: storyPath,
                    lastmod,
                    changefreq: 'daily',
                    priority: '0.9'
                });
            }

            categoryNames.forEach((categoryName) => {
                const categoryKey = normalizeCategoryKey(categoryName);
                if (!categoryKey) return;

                const categoryPath = `/stories?category=${encodeURIComponent(categoryName)}`;
                const existingCategoryEntry = categoryEntries.get(categoryKey);
                if (!existingCategoryEntry || existingCategoryEntry.lastmod < lastmod) {
                    categoryEntries.set(categoryKey, {
                        path: categoryPath,
                        lastmod
                    });
                }
            });

            rawTags.forEach((tag) => {
                const tagName = normalizeTagValue(tag);
                const tagKey = normalizeTagKey(tagName);
                if (!tagKey) return;

                const tagPath = `/stories?tag=${encodeURIComponent(tagName)}`;
                const existingTagEntry = tagEntries.get(tagKey);
                if (!existingTagEntry || existingTagEntry.lastmod < lastmod) {
                    tagEntries.set(tagKey, {
                        path: tagPath,
                        lastmod
                    });
                }
            });

            const parts = toStoryParts(story).slice(0, MAX_PARTS_PER_STORY);
            parts.forEach((_part, index) => {
                const partPath = `/stories/${encodedStorySegment}/part/${index + 1}`;
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

        categoryEntries.forEach((entry) => {
            if (seenPaths.has(entry.path)) return;
            seenPaths.add(entry.path);
            dynamicEntries.push({
                path: entry.path,
                lastmod: entry.lastmod,
                changefreq: 'weekly',
                priority: '0.7'
            });
        });

        tagEntries.forEach((entry) => {
            if (seenPaths.has(entry.path)) return;
            seenPaths.add(entry.path);
            dynamicEntries.push({
                path: entry.path,
                lastmod: entry.lastmod,
                changefreq: 'weekly',
                priority: '0.7'
            });
        });
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
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
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
        if (method === 'HEAD') {
            res.end();
        } else {
            res.end(xml);
        }
    } catch {
        const xml = buildFallbackSitemap();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
        if (method === 'HEAD') {
            res.end();
        } else {
            res.end(xml);
        }
    }
}
