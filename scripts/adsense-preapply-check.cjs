const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ADSENSE_SELLER_ID = 'f08c47fec0942fa0';
const DEFAULT_SITE_URL = 'https://www.mahean.com';
const DEFAULT_MIN_PUBLISHED_STORIES = 10;
const DEFAULT_MIN_STORY_URLS_IN_SITEMAP = 20;
const DEFAULT_SITEMAP_SAMPLE_CHECK_COUNT = 12;
const REQUEST_TIMEOUT_MS = 12000;
const GOOGLEBOT_USER_AGENT =
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const failures = [];
const warnings = [];

const ok = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
    failures.push(message);
    console.log(`FAIL  ${message}`);
};
const warn = (message) => {
    warnings.push(message);
    console.log(`WARN  ${message}`);
};

const normalizeBaseUrl = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return DEFAULT_SITE_URL;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withProtocol.replace(/\/+$/, '');
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const SITE_URL = normalizeBaseUrl(process.env.PRECHECK_SITE_URL || DEFAULT_SITE_URL);
const MIN_PUBLISHED_STORIES = parsePositiveInt(
    process.env.PRECHECK_MIN_PUBLISHED_STORIES,
    DEFAULT_MIN_PUBLISHED_STORIES
);
const MIN_STORY_URLS_IN_SITEMAP = parsePositiveInt(
    process.env.PRECHECK_MIN_STORY_URLS_IN_SITEMAP,
    DEFAULT_MIN_STORY_URLS_IN_SITEMAP
);
const SITEMAP_SAMPLE_CHECK_COUNT = parsePositiveInt(
    process.env.PRECHECK_SITEMAP_SAMPLE_CHECK_COUNT,
    DEFAULT_SITEMAP_SAMPLE_CHECK_COUNT
);

const section = (title) => {
    console.log(`\n=== ${title} ===`);
};

const stripLegacyMeta = (value) => {
    const raw = String(value || '');
    const start = '__MAHEAN_META__:';
    const end = ':__MAHEAN_META_END__';
    if (!raw.startsWith(start)) return raw;
    const markerEnd = raw.indexOf(end);
    if (markerEnd < 0) return raw;
    return raw.slice(markerEnd + end.length);
};

const isSuccessStatus = (status) => status >= 200 && status < 400;

const toAbsoluteUrl = (urlPath) => {
    if (/^https?:\/\//i.test(urlPath)) return urlPath;
    if (!urlPath.startsWith('/')) return `${SITE_URL}/${urlPath}`;
    return `${SITE_URL}${urlPath}`;
};

const fetchText = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body,
            redirect: 'follow',
            signal: controller.signal
        });
        const text = await response.text().catch(() => '');
        return { response, text };
    } finally {
        clearTimeout(timeoutId);
    }
};

const parseLocUrls = (xml) => {
    const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
    return Array.from(matches, (match) => String(match[1] || '').trim()).filter(Boolean);
};

const runLocalReadinessCheck = () => {
    section('Local Build Readiness');
    const scriptPath = path.join(__dirname, 'adsense-readiness.cjs');
    const result = spawnSync(process.execPath, [scriptPath], {
        encoding: 'utf8'
    });

    const stdout = String(result.stdout || '').trim();
    const stderr = String(result.stderr || '').trim();
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);

    if (result.status === 0) {
        ok('Local build readiness script passed.');
        return;
    }

    fail('Local build readiness script failed (run `npm run build` then re-run precheck).');
};

const checkHomeAdsenseTags = async () => {
    section('Homepage AdSense Tags');
    try {
        const { response, text } = await fetchText(toAbsoluteUrl('/'));
        if (!isSuccessStatus(response.status)) {
            fail(`Homepage returned ${response.status}.`);
            return;
        }

        ok(`Homepage returned ${response.status}.`);

        const hasMeta = /<meta\s+name=["']google-adsense-account["']\s+content=["']ca-pub-\d{6,}["'][^>]*>/i.test(text);
        if (hasMeta) {
            ok('`google-adsense-account` meta is present.');
        } else {
            fail('Homepage is missing valid `google-adsense-account` meta.');
        }

        const hasScript = /adsbygoogle\.js\?client=ca-pub-\d{6,}/i.test(text);
        if (hasScript) {
            ok('AdSense script with valid client id is present.');
        } else {
            fail('Homepage is missing valid AdSense script client id.');
        }
    } catch (error) {
        fail(`Failed to fetch homepage: ${error.message || error}`);
    }
};

const checkAdsTxt = async () => {
    section('ads.txt');
    try {
        const { response, text } = await fetchText(toAbsoluteUrl('/ads.txt'));
        if (!isSuccessStatus(response.status)) {
            fail(`ads.txt returned ${response.status}.`);
            return;
        }
        ok(`ads.txt returned ${response.status}.`);

        const validRecord = new RegExp(
            `^google\\.com,\\s*pub-\\d{6,},\\s*DIRECT,\\s*${ADSENSE_SELLER_ID}$`,
            'im'
        ).test(text);

        if (validRecord) {
            ok('ads.txt contains valid Google AdSense seller record.');
        } else {
            fail('ads.txt missing valid `google.com, pub-..., DIRECT, f08c47fec0942fa0` record.');
        }
    } catch (error) {
        fail(`Failed to fetch ads.txt: ${error.message || error}`);
    }
};

const checkRobotsAndSitemaps = async () => {
    section('Robots + Sitemaps');
    let sitemapStoryUrls = [];

    try {
        const { response, text } = await fetchText(toAbsoluteUrl('/robots.txt'));
        if (!isSuccessStatus(response.status)) {
            fail(`robots.txt returned ${response.status}.`);
        } else {
            ok(`robots.txt returned ${response.status}.`);
            if (/User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/im.test(text)) {
                fail('robots.txt blocks all crawlers with `Disallow: /`.');
            } else {
                ok('robots.txt does not block all crawlers.');
            }

            if (/Sitemap:\s*https?:\/\/[^\s]*sitemap\.xml/i.test(text)) {
                ok('robots.txt includes sitemap.xml reference.');
            } else {
                warn('robots.txt does not include sitemap.xml reference.');
            }

            if (/Sitemap:\s*https?:\/\/[^\s]*sitemap-news\.xml/i.test(text)) {
                ok('robots.txt includes sitemap-news.xml reference.');
            } else {
                warn('robots.txt does not include sitemap-news.xml reference.');
            }
        }
    } catch (error) {
        fail(`Failed to fetch robots.txt: ${error.message || error}`);
    }

    try {
        const { response, text } = await fetchText(toAbsoluteUrl('/sitemap.xml'));
        if (!isSuccessStatus(response.status)) {
            fail(`sitemap.xml returned ${response.status}.`);
        } else {
            ok(`sitemap.xml returned ${response.status}.`);
            const locs = parseLocUrls(text);
            sitemapStoryUrls = locs.filter((url) => url.includes('/stories/'));
            if (sitemapStoryUrls.length >= MIN_STORY_URLS_IN_SITEMAP) {
                ok(`sitemap.xml includes ${sitemapStoryUrls.length} story URLs.`);
            } else {
                fail(
                    `sitemap.xml story URLs too low (${sitemapStoryUrls.length}). Minimum expected: ${MIN_STORY_URLS_IN_SITEMAP}.`
                );
            }
        }
    } catch (error) {
        fail(`Failed to fetch sitemap.xml: ${error.message || error}`);
    }

    try {
        const { response, text } = await fetchText(toAbsoluteUrl('/sitemap-news.xml'));
        if (!isSuccessStatus(response.status)) {
            warn(`sitemap-news.xml returned ${response.status}.`);
        } else {
            ok(`sitemap-news.xml returned ${response.status}.`);
            const newsItems = (text.match(/<news:news>/g) || []).length;
            if (newsItems > 0) {
                ok(`sitemap-news.xml includes ${newsItems} news item(s).`);
            } else {
                warn('sitemap-news.xml has zero news items (acceptable if no recent content).');
            }
        }
    } catch (error) {
        warn(`Failed to fetch sitemap-news.xml: ${error.message || error}`);
    }

    return sitemapStoryUrls;
};

const checkLegalAndNoindexPages = async () => {
    section('Legal + Restricted Pages');

    const legalRoutes = ['/about', '/contact', '/privacy', '/terms', '/disclaimer'];
    for (const route of legalRoutes) {
        try {
            const { response } = await fetchText(toAbsoluteUrl(route));
            if (isSuccessStatus(response.status)) {
                ok(`${route} returned ${response.status}.`);
            } else {
                fail(`${route} returned ${response.status}.`);
            }
        } catch (error) {
            fail(`Failed to fetch ${route}: ${error.message || error}`);
        }
    }

    try {
        const { response } = await fetchText(toAbsoluteUrl('/admin/dashboard'));
        const xRobots = String(response.headers.get('x-robots-tag') || '').toLowerCase();
        if (xRobots.includes('noindex')) {
            ok('Admin page has `X-Robots-Tag: noindex`.');
        } else {
            warn('Admin page missing `X-Robots-Tag: noindex` header.');
        }
    } catch (error) {
        warn(`Failed to check admin noindex header: ${error.message || error}`);
    }
};

const checkPublishedContentHealth = async () => {
    section('Published Content Health');

    try {
        const payload = {
            table: 'stories',
            action: 'select',
            columns: 'id,title,status,excerpt,parts,date',
            orderBy: {
                column: 'date',
                ascending: false
            }
        };
        const { response, text } = await fetchText(toAbsoluteUrl('/api/db'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!isSuccessStatus(response.status)) {
            warn(`/api/db content audit returned ${response.status}.`);
            return;
        }

        const parsed = JSON.parse(text || '{}');
        const rows = Array.isArray(parsed?.data) ? parsed.data : [];
        const publishedRows = rows.filter((row) => {
            const status = String(row?.status || '').trim().toLowerCase();
            return !status || status === 'published';
        });

        if (publishedRows.length >= MIN_PUBLISHED_STORIES) {
            ok(`Published stories count: ${publishedRows.length}.`);
        } else {
            fail(
                `Published stories count too low (${publishedRows.length}). Minimum expected: ${MIN_PUBLISHED_STORIES}.`
            );
        }

        let thinCount = 0;
        for (const row of publishedRows) {
            const parts = Array.isArray(row?.parts) ? row.parts : [];
            let partsLen = 0;
            parts.forEach((part) => {
                partsLen += String(part?.content || '').trim().length;
            });
            const excerptLen = stripLegacyMeta(row?.excerpt).trim().length;
            const bodyLen = Math.max(partsLen, excerptLen);
            if (bodyLen < 300) {
                thinCount += 1;
            }
        }

        if (thinCount === 0) {
            ok('No thin published stories detected (body length >= 300 heuristic).');
        } else {
            warn(`Thin published stories detected: ${thinCount} (heuristic check).`);
        }
    } catch (error) {
        warn(`Failed to run content health audit: ${error.message || error}`);
    }
};

const checkSitemapSampleUrls = async (storyUrls) => {
    section('Story URL Sampling');

    if (!Array.isArray(storyUrls) || storyUrls.length === 0) {
        warn('No story URLs available for sample checks.');
        return;
    }

    const sampleUrls = storyUrls.slice(0, SITEMAP_SAMPLE_CHECK_COUNT);
    let failedCount = 0;

    for (const url of sampleUrls) {
        try {
            const { response } = await fetchText(url);
            if (!isSuccessStatus(response.status)) {
                failedCount += 1;
                console.log(`WARN  Story URL returned ${response.status}: ${url}`);
            }
        } catch (error) {
            failedCount += 1;
            console.log(`WARN  Story URL request failed: ${url} (${error.message || error})`);
        }
    }

    if (failedCount === 0) {
        ok(`Sampled ${sampleUrls.length} story URL(s), all reachable.`);
    } else {
        fail(`Sampled ${sampleUrls.length} story URL(s), failures: ${failedCount}.`);
    }
};

const checkBotSeoRendering = async (storyUrls) => {
    section('Bot SEO Rendering');

    const partUrl = (Array.isArray(storyUrls) ? storyUrls : []).find((url) => {
        const path = url.replace(/^https?:\/\/[^/]+/i, '');
        const segments = path.split('/').filter(Boolean);
        return segments.length >= 3 && segments[0] === 'stories';
    });

    if (!partUrl) {
        warn('No story-part URL found for Googlebot rendering check.');
        return;
    }

    try {
        const { response, text } = await fetchText(partUrl, {
            headers: {
                'User-Agent': GOOGLEBOT_USER_AGENT,
                Accept: 'text/html'
            }
        });

        if (!isSuccessStatus(response.status)) {
            warn(`Googlebot-render check URL returned ${response.status}.`);
            return;
        }

        const hasOgArticle = /property=["']og:type["']\s+content=["']article["']/i.test(text);
        const hasJsonLd = /application\/ld\+json/i.test(text);

        if (hasOgArticle) {
            ok('Googlebot page response includes `og:type=article`.');
        } else {
            warn('Googlebot page response missing `og:type=article`.');
        }

        if (hasJsonLd) {
            ok('Googlebot page response includes JSON-LD.');
        } else {
            warn('Googlebot page response missing JSON-LD.');
        }
    } catch (error) {
        warn(`Failed Googlebot rendering check: ${error.message || error}`);
    }
};

const run = async () => {
    console.log('AdSense Pre-Apply Checklist');
    console.log(`Target site: ${SITE_URL}`);
    console.log(
        `Thresholds: minPublished=${MIN_PUBLISHED_STORIES}, minSitemapStoryUrls=${MIN_STORY_URLS_IN_SITEMAP}, sampleUrls=${SITEMAP_SAMPLE_CHECK_COUNT}`
    );

    runLocalReadinessCheck();
    await checkHomeAdsenseTags();
    await checkAdsTxt();
    const sitemapStoryUrls = await checkRobotsAndSitemaps();
    await checkLegalAndNoindexPages();
    await checkPublishedContentHealth();
    await checkSitemapSampleUrls(sitemapStoryUrls);
    await checkBotSeoRendering(sitemapStoryUrls);

    console.log('\n=== Summary ===');
    if (failures.length) {
        console.log(`Result: FAIL (${failures.length} failure(s), ${warnings.length} warning(s))`);
        process.exitCode = 1;
        return;
    }

    if (warnings.length) {
        console.log(`Result: PASS with warnings (${warnings.length}).`);
    } else {
        console.log('Result: PASS (all checks successful).');
    }
};

run().catch((error) => {
    console.error('Precheck execution failed:', error);
    process.exitCode = 1;
});
