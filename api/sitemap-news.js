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
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const parseDate = (...values) => {
    for (const value of values) {
        const parsed = new Date(String(value || ''));
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return null;
};

const SITE_URL = normalizeBaseUrl(
    pickFirstEnv('SITE_URL', 'VITE_SITE_URL')
) || 'https://www.mahean.com';

const PUBLICATION_NAME = pickFirstEnv('NEWS_PUBLICATION_NAME') || 'Mahean';
const PUBLICATION_LANGUAGE = pickFirstEnv('NEWS_PUBLICATION_LANGUAGE') || 'bn';
const MAX_NEWS_ITEMS = Number.parseInt(String(process.env.NEWS_SITEMAP_MAX_ITEMS || ''), 10) || 1000;
const LOOKBACK_HOURS = Number.parseInt(String(process.env.NEWS_SITEMAP_LOOKBACK_HOURS || ''), 10) || 48;
const LOOKBACK_MS = LOOKBACK_HOURS * 60 * 60 * 1000;
const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';

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
    return candidate
        .map((part) => {
            if (!part || typeof part !== 'object') return null;
            const title = typeof part.title === 'string' ? part.title.trim() : '';
            const slug = typeof part.slug === 'string' ? part.slug.trim() : '';
            const content = typeof part.content === 'string' ? part.content.trim() : '';
            if (!title && !slug && !content) return null;
            return { title, slug, content };
        })
        .filter(Boolean);
};

const toPartSegment = (part, index) => {
    const custom = slugify(typeof part?.slug === 'string' ? part.slug : '');
    const byTitle = slugify(typeof part?.title === 'string' ? part.title : '');
    return custom || byTitle || String(index + 1);
};

const buildNewsEntries = async () => {
    const nowMs = Date.now();
    const entries = [];
    const seenLocs = new Set();

    const rows = await listRows('stories', {
        orderBy: { column: 'updated_at', ascending: false }
    });
    const stories = Array.isArray(rows) ? rows : [];

    for (const story of stories) {
        if (!isPublicStory(story)) continue;

        const publishedAt = parseDate(story?.date, story?.created_at, story?.updated_at);
        if (!publishedAt) continue;
        if (nowMs - publishedAt.getTime() > LOOKBACK_MS) continue;

        const storySegment = toStorySegment(story);
        if (!storySegment) continue;

        const parts = toStoryParts(story);
        const targetIndex = parts.length ? parts.length - 1 : 0;
        const targetPart = parts[targetIndex];
        const partSegment = toPartSegment(targetPart, targetIndex);
        const loc = `${SITE_URL}/stories/${encodeURIComponent(storySegment)}/${encodeURIComponent(partSegment)}`;
        if (seenLocs.has(loc)) continue;
        seenLocs.add(loc);

        const storyTitle = String(story?.title || '').trim();
        const partTitle = typeof targetPart?.title === 'string' ? targetPart.title.trim() : '';
        const newsTitle = partTitle && partTitle !== storyTitle
            ? `${storyTitle} - ${partTitle}`
            : storyTitle || partTitle || `Story ${story?.id || ''}`.trim();

        entries.push({
            loc,
            publicationDate: publishedAt.toISOString(),
            title: newsTitle,
            sortDate: publishedAt.getTime()
        });
    }

    return entries
        .sort((left, right) => right.sortDate - left.sortDate)
        .slice(0, MAX_NEWS_ITEMS);
};

const buildNewsSitemapXml = (entries) => {
    const rows = entries.map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${escapeXml(PUBLICATION_LANGUAGE)}</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(entry.publicationDate)}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>
    </news:news>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${rows.join('\n')}
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
        const entries = await buildNewsEntries();
        const xml = buildNewsSitemapXml(entries);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
        res.end(xml);
    } catch (error) {
        console.warn('[sitemap-news] Failed to generate news sitemap:', error);
        const xml = buildNewsSitemapXml([]);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
        res.end(xml);
    }
}
