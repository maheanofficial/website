const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ADSENSE_SELLER_ID = 'f08c47fec0942fa0';
const STORIES_DATA_PATH = path.join(ROOT_DIR, 'data', 'table-stories.json');

const MIN_PUBLIC_STORIES = 8;
const MIN_MEANINGFUL_STORIES = 5;
const MIN_STORY_BODY_CHARS = 1200;
const MIN_UNIQUE_AUTHORS = 3;
const MIN_UNIQUE_CATEGORIES = 3;

const requiredLegalRoutes = [
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/disclaimer'
];

const ok = (message) => console.log(`PASS  ${message}`);
const fail = (message) => console.log(`FAIL  ${message}`);
const warn = (message) => console.log(`WARN  ${message}`);

const readIfExists = async (filePath) => {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return '';
        }
        throw error;
    }
};

const pathForRoute = (route) => {
    if (route === '/') return path.join(DIST_DIR, 'index.html');
    return path.join(DIST_DIR, route.replace(/^\/+/, ''), 'index.html');
};

const LEGACY_META_END = ':__MAHEAN_META_END__';

const stripLegacyMeta = (value) => {
    const raw = String(value || '');
    const markerEnd = raw.indexOf(LEGACY_META_END);
    if (markerEnd < 0) return raw;
    return raw.slice(markerEnd + LEGACY_META_END.length);
};

const normalizePlainText = (value) =>
    String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const getStoryBody = (story) => {
    const partsText = Array.isArray(story?.parts)
        ? story.parts
            .map((part) => normalizePlainText(part?.content))
            .filter(Boolean)
            .join('\n\n')
        : '';

    return normalizePlainText(
        [partsText, story?.content, stripLegacyMeta(story?.excerpt)]
            .filter(Boolean)
            .join('\n\n')
    );
};

const isPublicStory = (story) => {
    const status = String(story?.status || '').trim().toLowerCase();
    if (!status) return true;
    return status === 'published' || status === 'completed' || status === 'ongoing';
};

const isLikelyPlaceholder = (story, bodyLength) => {
    const title = String(story?.title || '').trim().toLowerCase();
    const weakTitle = !title || /^(\d+|test|demo|sample)$/i.test(title);
    return weakTitle && bodyLength < 200;
};

const run = async () => {
    let hasFailures = false;

    const indexPath = path.join(DIST_DIR, 'index.html');
    const indexHtml = await readIfExists(indexPath);
    if (!indexHtml) {
        fail('dist/index.html not found. Run `npm run build` first.');
        process.exitCode = 1;
        return;
    }

    const accountMetaMatch = indexHtml.match(
        /<meta\s+name=["']google-adsense-account["']\s+content=["'](ca-pub-\d{6,})["'][^>]*>/i
    );
    if (accountMetaMatch) {
        ok(`AdSense account meta found (${accountMetaMatch[1]}).`);
    } else {
        fail('AdSense account meta not found with a valid ca-pub id in dist/index.html.');
        hasFailures = true;
    }

    const scriptMatch = indexHtml.match(
        /https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=(ca-pub-\d{6,})/i
    );
    if (scriptMatch) {
        ok('AdSense script tag found with a valid client id.');
    } else {
        fail('AdSense script tag is missing or does not include a valid client id.');
        hasFailures = true;
    }

    const adsTxtPath = path.join(DIST_DIR, 'ads.txt');
    const adsTxt = await readIfExists(adsTxtPath);
    const adsTxtMatch = adsTxt.match(
        new RegExp(`^google\\.com,\\s*pub-\\d{6,},\\s*DIRECT,\\s*${ADSENSE_SELLER_ID}$`, 'im')
    );
    if (adsTxtMatch) {
        ok('ads.txt contains a valid AdSense record.');
    } else {
        fail('ads.txt does not contain a valid AdSense record (google.com, pub-..., DIRECT, f08c47fec0942fa0).');
        hasFailures = true;
    }

    for (const route of requiredLegalRoutes) {
        const html = await readIfExists(pathForRoute(route));
        if (html) {
            ok(`Legal page exists: ${route}`);
        } else {
            fail(`Missing legal page output: ${route}`);
            hasFailures = true;
        }
    }

    const storiesRaw = await readIfExists(STORIES_DATA_PATH);
    if (!storiesRaw) {
        fail('data/table-stories.json not found. Add enough published content before re-applying.');
        hasFailures = true;
    } else {
        try {
            const parsed = JSON.parse(storiesRaw);
            const allStories = Array.isArray(parsed?.rows) ? parsed.rows : [];
            const publicStories = allStories.filter(isPublicStory);
            const bodies = publicStories.map((story) => {
                const body = getStoryBody(story);
                return { story, body, bodyLength: body.length };
            });

            if (publicStories.length >= MIN_PUBLIC_STORIES) {
                ok(`Published stories: ${publicStories.length} (min ${MIN_PUBLIC_STORIES}).`);
            } else {
                fail(`Published stories too low: ${publicStories.length}. Minimum ${MIN_PUBLIC_STORIES} is recommended.`);
                hasFailures = true;
            }

            const meaningfulCount = bodies.filter((entry) => entry.bodyLength >= MIN_STORY_BODY_CHARS).length;
            if (meaningfulCount >= MIN_MEANINGFUL_STORIES) {
                ok(`Meaningful story bodies: ${meaningfulCount} stories have ${MIN_STORY_BODY_CHARS}+ chars.`);
            } else {
                fail(`Content depth is low: only ${meaningfulCount} stories have ${MIN_STORY_BODY_CHARS}+ chars.`);
                hasFailures = true;
            }

            const uniqueAuthors = new Set(
                publicStories
                    .map((story) => String(story?.author || '').trim())
                    .filter(Boolean)
            );
            if (uniqueAuthors.size >= MIN_UNIQUE_AUTHORS) {
                ok(`Unique public authors: ${uniqueAuthors.size}.`);
            } else {
                warn(`Low author variety: only ${uniqueAuthors.size} unique author(s).`);
            }

            const uniqueCategories = new Set(
                publicStories
                    .map((story) => String(story?.category || '').trim())
                    .filter(Boolean)
            );
            if (uniqueCategories.size >= MIN_UNIQUE_CATEGORIES) {
                ok(`Unique public categories: ${uniqueCategories.size}.`);
            } else {
                warn(`Low category variety: only ${uniqueCategories.size} category(ies).`);
            }

            const placeholderCount = bodies.filter((entry) => isLikelyPlaceholder(entry.story, entry.bodyLength)).length;
            if (placeholderCount > 0) {
                fail(`Found ${placeholderCount} placeholder-like published story entries. Replace them with original content.`);
                hasFailures = true;
            } else {
                ok('No placeholder-like published stories detected.');
            }
        } catch (error) {
            fail(`Failed to parse data/table-stories.json: ${error.message}`);
            hasFailures = true;
        }
    }

    const robotsTxt = await readIfExists(path.join(DIST_DIR, 'robots.txt'));
    if (!robotsTxt) {
        warn('dist/robots.txt not found.');
    } else {
        if (/User-agent:\s*\*\s*[\s\S]*?Disallow:\s*\/\s*$/im.test(robotsTxt)) {
            fail('robots.txt blocks all crawlers (Disallow: /).');
            hasFailures = true;
        } else {
            ok('robots.txt does not block all crawlers.');
        }

        if (/User-agent:\s*Mediapartners-Google[\s\S]*?Disallow:\s*\/\s*$/im.test(robotsTxt)) {
            fail('robots.txt blocks Mediapartners-Google.');
            hasFailures = true;
        } else {
            ok('robots.txt does not block Mediapartners-Google.');
        }
    }

    if (hasFailures) {
        console.error('\nAdSense readiness check failed.');
        process.exitCode = 1;
        return;
    }

    console.log('\nAdSense readiness check passed.');
};

run().catch((error) => {
    console.error('Failed to run AdSense readiness check:', error);
    process.exitCode = 1;
});
