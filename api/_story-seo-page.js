import { promises as fsp } from 'node:fs';

import { listRows } from './_table-store.js';

const DEFAULT_SITE_URL = 'https://www.mahean.com';
const STORY_CACHE_TTL_MS = 90_000;
const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';
const MAX_NOSCRIPT_PART_LINKS = 40;

let storyCache = {
    expiresAt: 0,
    rows: []
};

let templateCache = {
    path: '',
    mtimeMs: 0,
    html: ''
};

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
) || DEFAULT_SITE_URL;

const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeDecode = (value) => {
    try {
        return decodeURIComponent(String(value || ''));
    } catch {
        return String(value || '');
    }
};

const normalizeUnicode = (value) => {
    try {
        return String(value || '').normalize('NFKC');
    } catch {
        return String(value || '');
    }
};

const slugify = (value) => {
    const normalized = normalizeUnicode(value)
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

const normalizePlainText = (value) =>
    String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const truncate = (value, maxLength) => {
    const normalized = normalizePlainText(value);
    if (!normalized) return '';
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const parseLegacyMeta = (excerpt) => {
    const raw = String(excerpt || '');
    if (!raw.startsWith(LEGACY_META_START)) return null;
    const markerEnd = raw.indexOf(LEGACY_META_END);
    if (markerEnd < 0) return null;
    const payload = raw.slice(LEGACY_META_START.length, markerEnd);
    try {
        const parsed = JSON.parse(payload);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
};

const normalizeExcerpt = (value) => {
    const raw = String(value || '');
    if (!raw.startsWith(LEGACY_META_START)) return raw.trim();
    const markerEnd = raw.indexOf(LEGACY_META_END);
    if (markerEnd < 0) return raw.trim();
    return raw.slice(markerEnd + LEGACY_META_END.length).trim();
};

const isPublicStory = (story) => {
    const meta = parseLegacyMeta(story?.excerpt);
    const status = String(story?.status || meta?.status || '').trim().toLowerCase();
    if (!status) return true;
    return status === 'published' || status === 'completed' || status === 'ongoing';
};

const toStorySegment = (story) => {
    const meta = parseLegacyMeta(story?.excerpt);
    const rawSlug = typeof story?.slug === 'string' ? story.slug.trim() : '';
    const metaSlug = typeof meta?.slug === 'string' ? String(meta.slug).trim() : '';
    const generated = slugify(typeof story?.title === 'string' ? story.title : '');
    const fallbackId = String(story?.id || '').trim();
    return rawSlug || metaSlug || generated || fallbackId || '';
};

const BANGLA_DIGIT_TO_LATIN = {
    '\u09e6': '0',
    '\u09e7': '1',
    '\u09e8': '2',
    '\u09e9': '3',
    '\u09ea': '4',
    '\u09eb': '5',
    '\u09ec': '6',
    '\u09ed': '7',
    '\u09ee': '8',
    '\u09ef': '9'
};

const LEGACY_BANGLA_PART_TITLE_REGEX = /^\u09aa\u09b0\u09cd\u09ac\s*([\u09e6-\u09ef0-9]+)$/u;
const ENGLISH_PART_TITLE_REGEX = /^part\s*[-: ]*\s*([\u09e6-\u09ef0-9]+)$/iu;
const NUMERIC_PART_TITLE_REGEX = /^[\u09e6-\u09ef0-9]+$/u;

const parsePartNumberFromTitle = (value) => {
    const trimmed = normalizeUnicode(value).trim();
    if (!trimmed) return null;

    let digitSource = '';
    const legacyMatch = trimmed.match(LEGACY_BANGLA_PART_TITLE_REGEX);
    const englishMatch = trimmed.match(ENGLISH_PART_TITLE_REGEX);
    if (legacyMatch) {
        digitSource = legacyMatch[1];
    } else if (englishMatch) {
        digitSource = englishMatch[1];
    } else if (NUMERIC_PART_TITLE_REGEX.test(trimmed)) {
        digitSource = trimmed;
    } else {
        return null;
    }

    const normalizedDigits = String(digitSource).replace(
        /[\u09e6-\u09ef]/g,
        (digit) => BANGLA_DIGIT_TO_LATIN[digit] || digit
    );
    const parsed = Number.parseInt(normalizedDigits, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    return parsed;
};

const normalizePartLabel = (title, index) => {
    const trimmed = normalizeUnicode(title).trim();
    if (!trimmed) return `Part ${String(index + 1).padStart(2, '0')}`;
    const parsed = parsePartNumberFromTitle(trimmed);
    if (parsed === null) return trimmed;
    return `Part ${String(parsed).padStart(2, '0')}`;
};

const toStoryParts = (story) => {
    const meta = parseLegacyMeta(story?.excerpt);
    const fromRow = Array.isArray(story?.parts) ? story.parts : [];
    const fromMeta = Array.isArray(meta?.parts) ? meta.parts : [];
    const candidate = fromRow.length ? fromRow : fromMeta;

    const normalized = candidate
        .map((part) => {
            if (!part || typeof part !== 'object') return null;
            const title = typeof part.title === 'string' ? part.title : '';
            const slug = typeof part.slug === 'string' ? part.slug : '';
            const content = typeof part.content === 'string' ? part.content : '';
            if (!title.trim() && !content.trim() && !slug.trim()) return null;
            return {
                title: title.trim(),
                slug: slug.trim(),
                content: content.trim()
            };
        })
        .filter(Boolean);

    if (normalized.length) return normalized;

    const fallbackContent = String(story?.content || normalizeExcerpt(story?.excerpt) || '').trim();
    return [{
        title: '',
        slug: '',
        content: fallbackContent
    }];
};

const toPartSegment = (part, index) => {
    const custom = slugify(typeof part?.slug === 'string' ? part.slug : '');
    const fromTitle = slugify(normalizePartLabel(part?.title, index));
    return custom || fromTitle || String(index + 1);
};

const parseRequestedPartNumber = (value) => {
    const normalizedDigits = String(value || '')
        .trim()
        .replace(/[\u09e6-\u09ef]/g, (digit) => BANGLA_DIGIT_TO_LATIN[digit] || digit);
    if (!/^\d+$/.test(normalizedDigits)) return null;
    const parsed = Number.parseInt(normalizedDigits, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    return parsed;
};

const resolvePartIndex = (parts, partParam) => {
    if (!Array.isArray(parts) || !parts.length) return 0;
    const normalizedPartParam = safeDecode(partParam).trim();
    if (!normalizedPartParam) return 0;

    const normalizedKey = slugify(normalizedPartParam);
    if (normalizedKey) {
        const matchedIndex = parts.findIndex((part, index) => {
            const candidate = toPartSegment(part, index);
            return candidate === normalizedKey || slugify(candidate) === normalizedKey;
        });
        if (matchedIndex >= 0) return matchedIndex;
    }

    const number = parseRequestedPartNumber(normalizedPartParam);
    if (number !== null) {
        return Math.min(Math.max(number - 1, 0), parts.length - 1);
    }

    return 0;
};

const extractRouteState = (pathname) => {
    const segments = String(pathname || '')
        .split('/')
        .filter(Boolean);
    if (segments.length < 2 || segments[0] !== 'stories') return null;
    if (segments.length === 2) {
        return {
            storyParam: safeDecode(segments[1]),
            partParam: '',
            isPartRoute: false
        };
    }
    if (segments.length === 3) {
        return {
            storyParam: safeDecode(segments[1]),
            partParam: safeDecode(segments[2]),
            isPartRoute: true
        };
    }
    if (segments.length === 4 && segments[2].toLowerCase() === 'part') {
        return {
            storyParam: safeDecode(segments[1]),
            partParam: safeDecode(segments[3]),
            isPartRoute: true
        };
    }
    return null;
};

const toDateValue = (...values) => {
    for (const value of values) {
        const parsed = new Date(String(value || ''));
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }
    return new Date().toISOString();
};

const toTagList = (story) =>
    Array.isArray(story?.tags)
        ? story.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
        : [];

const setTitle = (html, title) =>
    html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

const upsertTag = (html, pattern, replacement) => {
    if (pattern.test(html)) {
        return html.replace(pattern, replacement);
    }
    return html.replace('</head>', `  ${replacement}\n</head>`);
};

const setMetaName = (html, name, content) => {
    const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
    const pattern = new RegExp(
        `<meta\\s+name=["']${escapeRegex(name)}["']\\s+content=["'][^"']*["']\\s*/?>`,
        'i'
    );
    return upsertTag(html, pattern, tag);
};

const setMetaProperty = (html, property, content) => {
    const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
    const pattern = new RegExp(
        `<meta\\s+property=["']${escapeRegex(property)}["']\\s+content=["'][^"']*["']\\s*/?>`,
        'i'
    );
    return upsertTag(html, pattern, tag);
};

const setCanonical = (html, canonicalUrl) => {
    const tag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
    const pattern = /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i;
    return upsertTag(html, pattern, tag);
};

const setJsonLd = (html, jsonLd) => {
    if (!jsonLd) return html;
    const json = JSON.stringify(jsonLd).replace(/<\/script/gi, '<\\/script');
    const clean = html.replace(
        /<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/i,
        ''
    );
    return clean.replace(
        '</head>',
        `  <script type="application/ld+json">${json}</script>\n</head>`
    );
};

const injectNoScript = (html, markup) => {
    const anchor = '<div id="root"></div>';
    if (!html.includes(anchor)) return html;
    return html.replace(anchor, `${anchor}\n${markup}`);
};

const buildSeoHtml = (template, seo) => {
    const ogImage = String(seo.ogImage || `${SITE_URL}/mahean-3.jpg`);
    let html = template;
    html = setTitle(html, seo.title);
    html = setCanonical(html, seo.canonicalUrl);
    html = setMetaName(html, 'description', seo.description);
    html = setMetaName(html, 'keywords', seo.keywords || '');
    html = setMetaName(html, 'robots', 'index, follow, max-image-preview:large');
    html = setMetaProperty(html, 'og:type', seo.ogType || 'article');
    html = setMetaProperty(html, 'og:title', seo.title);
    html = setMetaProperty(html, 'og:description', seo.description);
    html = setMetaProperty(html, 'og:url', seo.canonicalUrl);
    html = setMetaProperty(html, 'og:site_name', 'Mahean Ahmed');
    html = setMetaProperty(html, 'og:image', ogImage);
    html = setMetaProperty(html, 'og:image:alt', seo.imageAlt || seo.title);
    html = setMetaName(html, 'twitter:card', 'summary_large_image');
    html = setMetaName(html, 'twitter:title', seo.title);
    html = setMetaName(html, 'twitter:description', seo.description);
    html = setMetaName(html, 'twitter:site', '@mahean_ahmed');
    html = setMetaName(html, 'twitter:image', ogImage);
    html = setMetaName(html, 'twitter:image:alt', seo.imageAlt || seo.title);
    if (seo.author) {
        html = setMetaName(html, 'author', seo.author);
        html = setMetaProperty(html, 'article:author', seo.author);
    }
    if (seo.publishedTime) {
        html = setMetaProperty(html, 'article:published_time', seo.publishedTime);
    }
    if (seo.modifiedTime) {
        html = setMetaProperty(html, 'article:modified_time', seo.modifiedTime);
    }
    html = setJsonLd(html, seo.jsonLd);
    return html;
};

const getTemplateHtml = async (indexHtmlPath) => {
    const stat = await fsp.stat(indexHtmlPath);
    if (
        templateCache.path === indexHtmlPath
        && templateCache.html
        && templateCache.mtimeMs === stat.mtimeMs
    ) {
        return templateCache.html;
    }
    const html = await fsp.readFile(indexHtmlPath, 'utf8');
    templateCache = {
        path: indexHtmlPath,
        mtimeMs: stat.mtimeMs,
        html
    };
    return html;
};

const fetchPublicStories = async () => {
    const now = Date.now();
    if (storyCache.expiresAt > now && Array.isArray(storyCache.rows)) {
        return storyCache.rows;
    }

    try {
        const rows = await listRows('stories', {
            orderBy: { column: 'updated_at', ascending: false }
        });
        const normalizedRows = Array.isArray(rows) ? rows.filter(isPublicStory) : [];
        storyCache = {
            rows: normalizedRows,
            expiresAt: now + STORY_CACHE_TTL_MS
        };
        return normalizedRows;
    } catch (error) {
        console.warn('[story-seo] failed to fetch stories:', error?.message || error);
        return [];
    }
};

const findStoryBySegment = (stories, storyParam) => {
    const rawParam = safeDecode(storyParam).trim();
    if (!rawParam) return null;
    const slugifiedParam = slugify(rawParam);
    return stories.find((story) => {
        const segment = toStorySegment(story);
        if (!segment) return false;
        if (segment === rawParam) return true;
        if (String(story.id || '').trim() === rawParam) return true;
        return slugify(segment) === slugifiedParam;
    }) || null;
};

const buildNoScriptMarkup = ({ storyTitle, description, canonicalUrl, partLabel, partLinks }) => {
    const heading = partLabel ? `${storyTitle} - ${partLabel}` : `${storyTitle} - All Parts`;
    const linksHtml = partLinks.length
        ? `<ul>${partLinks.map((entry) => `<li><a href="${escapeHtml(entry.href)}">${escapeHtml(entry.label)}</a></li>`).join('')}</ul>`
        : '';
    return `<noscript><main style="max-width:960px;margin:24px auto;padding:0 16px;color:#111;font-family:system-ui,sans-serif;"><article><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p><p><a href="${escapeHtml(canonicalUrl)}">${escapeHtml(canonicalUrl)}</a></p>${linksHtml}</article></main></noscript>`;
};

const buildSeoPayload = ({ story, storySegment, parts, partIndex, isPartRoute }) => {
    const storyTitle = normalizePlainText(story.title) || 'Bangla Story';
    const storyAuthor = normalizePlainText(story.author) || 'Mahean Ahmed';
    const storyCategory = normalizePlainText(story.category);
    const tags = toTagList(story);
    const image = story.cover_image || story.image || `${SITE_URL}/mahean-3.jpg`;
    const publishedTime = toDateValue(story.date, story.created_at);
    const modifiedTime = toDateValue(story.updated_at, story.date, story.created_at);
    const storyPath = `/stories/${encodeURIComponent(storySegment)}`;
    const storyCanonicalUrl = `${SITE_URL}${storyPath}`;
    const storyDescription = truncate(
        normalizeExcerpt(story.excerpt) || story.content || parts[0]?.content || '',
        180
    ) || 'Read Bangla story parts on Mahean.com.';

    if (!isPartRoute) {
        const listItems = parts.slice(0, 200).map((part, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: normalizePartLabel(part?.title, index),
            url: `${SITE_URL}${storyPath}/${encodeURIComponent(toPartSegment(part, index))}`
        }));
        return {
            storyTitle,
            canonicalUrl: storyCanonicalUrl,
            description: storyDescription,
            seo: {
                title: `${storyTitle} - All Parts | Mahean Ahmed`,
                description: storyDescription,
                keywords: [storyCategory, ...tags, storyAuthor, 'Bangla Story', 'Story Parts']
                    .filter(Boolean)
                    .join(', '),
                canonicalUrl: storyCanonicalUrl,
                ogType: 'article',
                ogImage: image,
                imageAlt: storyTitle,
                author: storyAuthor,
                publishedTime,
                modifiedTime,
                jsonLd: {
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: `${storyTitle} - All Parts`,
                    itemListElement: listItems
                }
            },
            partLabel: '',
            partLinks: parts.slice(0, MAX_NOSCRIPT_PART_LINKS).map((part, index) => ({
                href: `${SITE_URL}${storyPath}/${encodeURIComponent(toPartSegment(part, index))}`,
                label: normalizePartLabel(part?.title, index)
            }))
        };
    }

    const safeIndex = Math.min(Math.max(partIndex, 0), Math.max(parts.length - 1, 0));
    const part = parts[safeIndex];
    const partLabel = normalizePartLabel(part?.title, safeIndex);
    const partSegment = toPartSegment(part, safeIndex);
    const canonicalUrl = `${SITE_URL}${storyPath}/${encodeURIComponent(partSegment)}`;
    const description = truncate(part?.content || storyDescription, 180) || storyDescription;
    const headline = `${storyTitle} - ${partLabel}`;

    return {
        storyTitle,
        canonicalUrl,
        description,
        seo: {
            title: `${headline} | Mahean Ahmed`,
            description,
            keywords: [storyCategory, ...tags, storyAuthor, 'Bangla Story', partLabel]
                .filter(Boolean)
                .join(', '),
            canonicalUrl,
            ogType: 'article',
            ogImage: image,
            imageAlt: storyTitle,
            author: storyAuthor,
            publishedTime,
            modifiedTime,
            jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline,
                description,
                url: canonicalUrl,
                datePublished: publishedTime,
                dateModified: modifiedTime,
                author: {
                    '@type': 'Person',
                    name: storyAuthor
                },
                image: [image]
            }
        },
        partLabel,
        partLinks: parts.slice(0, MAX_NOSCRIPT_PART_LINKS).map((partItem, index) => ({
            href: `${SITE_URL}${storyPath}/${encodeURIComponent(toPartSegment(partItem, index))}`,
            label: normalizePartLabel(partItem?.title, index)
        }))
    };
};

export const tryServeStorySeoPage = async ({ req, res, pathname, indexHtmlPath }) => {
    const routeState = extractRouteState(pathname);
    if (!routeState) return false;

    const stories = await fetchPublicStories();
    if (!stories.length) return false;

    const matchedStory = findStoryBySegment(stories, routeState.storyParam);
    if (!matchedStory) return false;

    const storySegment = toStorySegment(matchedStory);
    if (!storySegment) return false;

    const parts = toStoryParts(matchedStory);
    const partIndex = routeState.isPartRoute
        ? resolvePartIndex(parts, routeState.partParam)
        : 0;

    let template;
    try {
        template = await getTemplateHtml(indexHtmlPath);
    } catch (error) {
        console.warn('[story-seo] failed to read index template:', error?.message || error);
        return false;
    }

    const payload = buildSeoPayload({
        story: matchedStory,
        storySegment,
        parts,
        partIndex,
        isPartRoute: routeState.isPartRoute
    });

    let html = buildSeoHtml(template, payload.seo);
    html = injectNoScript(
        html,
        buildNoScriptMarkup({
            storyTitle: payload.storyTitle,
            description: payload.description,
            canonicalUrl: payload.canonicalUrl,
            partLabel: payload.partLabel,
            partLinks: payload.partLinks
        })
    );

    const body = Buffer.from(html, 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Length', String(body.length));
    if ((req.method || 'GET').toUpperCase() === 'HEAD') {
        res.end();
    } else {
        res.end(body);
    }
    return true;
};
