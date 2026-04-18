import adminUsersHandler from '../api/admin-users.js';
import authHandler from '../api/auth.js';
import cleanupTrashHandler from '../api/cleanup-trash.js';
import commentsHandler from '../api/comments.js';
import dbHandler from '../api/db.js';
import readerStateHandler from '../api/reader-state.js';
import sitemapHandler from '../api/sitemap.js';
import sitemapNewsHandler from '../api/sitemap-news.js';
import storyRedirectHandler from '../api/story-redirect.js';
import uploadImageHandler from '../api/upload-image.js';
import { tryServeStorySeoPage } from '../api/_story-seo-page.js';
import { runNodeHandler } from './node-handler-adapter.js';

const API_HANDLERS = new Map([
    ['/api/admin-users', adminUsersHandler],
    ['/api/auth', authHandler],
    ['/api/cleanup-trash', cleanupTrashHandler],
    ['/api/comments', commentsHandler],
    ['/api/db', dbHandler],
    ['/api/reader-state', readerStateHandler],
    ['/api/upload-image', uploadImageHandler],
    ['/api/story-redirect', storyRedirectHandler]
]);

const SPA_EXACT_PATHS = new Set([
    '/',
    '/audiobooks',
    '/stories',
    '/series',
    '/authors',
    '/categories',
    '/tags',
    '/login',
    '/forgot-password',
    '/update-password',
    '/signup',
    '/profile',
    '/admin',
    '/dashboard',
    '/user/dashboard',
    '/author/dashboard',
    '/skills',
    '/contact',
    '/privacy',
    '/terms',
    '/disclaimer',
    '/about',
    '/links'
]);

const SPA_PREFIX_PATHS = [
    '/stories/',
    '/admin/',
    '/dashboard/',
    '/user/dashboard/',
    '/author/dashboard/'
];

const BOT_USER_AGENT_PATTERN = /bot|crawl|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|google-inspectiontool/i;

const toNormalizedPathname = (pathname) => {
    const decoded = decodeURIComponent(pathname || '/');
    if (decoded !== '/' && decoded.endsWith('/')) {
        return decoded.replace(/\/+$/, '');
    }
    return decoded || '/';
};

const isHtmlNavigation = (request) => {
    const accept = request.headers.get('accept') || '';
    if (!accept) return true;
    return accept.includes('text/html') || accept.includes('*/*');
};

const isCrawlerNavigation = (request) =>
    BOT_USER_AGENT_PATTERN.test(request.headers.get('user-agent') || '');

const isKnownSpaRoute = (pathname) =>
    SPA_EXACT_PATHS.has(pathname)
    || SPA_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));

const firstHostValue = (value) =>
    String(value || '')
        .split(',')[0]
        .trim()
        .toLowerCase()
        .replace(/:\d+$/, '');

const resolveCanonicalHost = (env) =>
    String(env?.CANONICAL_HOST || 'www.mahean.com')
        .trim()
        .toLowerCase();

const buildRobotsTxt = (canonicalHost) => `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /author/dashboard

# Sitemaps
Sitemap: https://${canonicalHost}/sitemap.xml
Sitemap: https://${canonicalHost}/sitemap-news.xml
Host: ${canonicalHost}
`;

const isAdminRoute = (pathname) =>
    pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname === '/dashboard'
    || pathname.startsWith('/dashboard/')
    || pathname === '/user/dashboard'
    || pathname.startsWith('/user/dashboard/')
    || pathname.startsWith('/author/dashboard');

const isAuthUtilityRoute = (pathname) =>
    pathname === '/login'
    || pathname === '/signup'
    || pathname === '/forgot-password'
    || pathname === '/update-password'
    || pathname === '/profile';

const createAssetRequest = (request, pathname) => {
    const url = new URL(request.url);
    url.pathname = pathname;
    url.search = '';
    return new Request(url.toString(), {
        method: 'GET',
        headers: request.headers
    });
};

const withSecurityHeaders = (request, response, pathname) => {
    const headers = new Headers(response.headers);

    if (!headers.has('x-content-type-options')) {
        headers.set('X-Content-Type-Options', 'nosniff');
    }
    if (!headers.has('x-frame-options')) {
        headers.set('X-Frame-Options', 'SAMEORIGIN');
    }
    if (!headers.has('referrer-policy')) {
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
    if (!headers.has('permissions-policy')) {
        headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }
    if (!headers.has('cross-origin-resource-policy')) {
        headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    }
    if (!headers.has('cross-origin-opener-policy')) {
        headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    }
    if (!headers.has('x-dns-prefetch-control')) {
        headers.set('X-DNS-Prefetch-Control', 'off');
    }
    if (!headers.has('x-permitted-cross-domain-policies')) {
        headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    }
    if (new URL(request.url).protocol === 'https:' && !headers.has('strict-transport-security')) {
        headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    if (isAdminRoute(pathname) || isAuthUtilityRoute(pathname)) {
        headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    const method = (request.method || 'GET').toUpperCase();
    const body = method === 'HEAD' ? null : response.body;

    return new Response(body, {
        status: response.status,
        headers
    });
};

const toR2UploadResponse = (request, object) => {
    const headers = new Headers();
    if (typeof object?.writeHttpMetadata === 'function') {
        object.writeHttpMetadata(headers);
    }
    if (object?.httpEtag) {
        headers.set('ETag', object.httpEtag);
    }
    if (!headers.has('content-type')) {
        headers.set('Content-Type', 'application/octet-stream');
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    const body = request.method.toUpperCase() === 'HEAD' ? null : object.body;
    return new Response(body, {
        status: 200,
        headers
    });
};

const runAppHandler = (request, env, handler) =>
    runNodeHandler({ request, env, handler });

const runStorySeoHandler = async (request, env, pathname, assets) => {
    const templateResponse = await assets.fetch(createAssetRequest(request, '/index.html'));
    if (!templateResponse.ok) {
        return null;
    }
    const indexHtml = await templateResponse.text();

    const seoResponse = await runNodeHandler({
        request,
        env,
        handler: async (req, res) => {
            const served = await tryServeStorySeoPage({
                req,
                res,
                pathname,
                indexHtml
            });
            if (!served) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end('Not Found');
            }
        }
    });

    if (seoResponse.status === 404) {
        return null;
    }
    return seoResponse;
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const method = (request.method || 'GET').toUpperCase();
        const pathname = toNormalizedPathname(url.pathname);
        const host = firstHostValue(url.host || request.headers.get('host') || '');
        const canonicalHost = resolveCanonicalHost(env);
        const canonicalApexHost = canonicalHost.startsWith('www.')
            ? canonicalHost.slice(4)
            : canonicalHost;

        const shouldRedirectToCanonical = (method === 'GET' || method === 'HEAD')
            && (host === canonicalHost || host === canonicalApexHost)
            && (url.protocol !== 'https:' || host !== canonicalHost);

        if (shouldRedirectToCanonical) {
            const location = `https://${canonicalHost}${url.pathname || '/'}${url.search || ''}`;
            return withSecurityHeaders(
                request,
                Response.redirect(location, 301),
                pathname
            );
        }

        if (pathname === '/healthz') {
            return withSecurityHeaders(
                request,
                new Response('ok', {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    }
                }),
                pathname
            );
        }

        if (pathname === '/robots.txt') {
            return withSecurityHeaders(
                request,
                new Response(buildRobotsTxt(canonicalHost), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600'
                    }
                }),
                pathname
            );
        }

        const directApiHandler = API_HANDLERS.get(pathname);
        if (directApiHandler) {
            const response = await runAppHandler(request, env, directApiHandler);
            return withSecurityHeaders(request, response, pathname);
        }

        if (pathname === '/sitemap.xml') {
            const response = await runAppHandler(request, env, sitemapHandler);
            return withSecurityHeaders(request, response, pathname);
        }

        if (pathname === '/sitemap-news.xml') {
            const response = await runAppHandler(request, env, sitemapNewsHandler);
            return withSecurityHeaders(request, response, pathname);
        }

        if (pathname.startsWith('/uploads/') && (method === 'GET' || method === 'HEAD')) {
            const r2Key = pathname.slice(1);
            const object = env?.UPLOADS_BUCKET && await env.UPLOADS_BUCKET.get(r2Key);
            if (object) {
                return withSecurityHeaders(
                    request,
                    toR2UploadResponse(request, object),
                    pathname
                );
            }
        }

        if (method !== 'GET' && method !== 'HEAD') {
            return withSecurityHeaders(
                request,
                new Response('Method Not Allowed', {
                    status: 405,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    }
                }),
                pathname
            );
        }

        const assets = env?.ASSETS;
        if (!assets || typeof assets.fetch !== 'function') {
            return withSecurityHeaders(
                request,
                new Response('ASSETS binding is missing.', {
                    status: 500,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    }
                }),
                pathname
            );
        }

        const hasExtension = /\.[^/]+$/.test(pathname);
        const shouldBypassDirectStoryAsset = !hasExtension
            && isHtmlNavigation(request)
            && pathname.startsWith('/stories/');

        if (!shouldBypassDirectStoryAsset) {
            const directAssetResponse = await assets.fetch(request);
            if (directAssetResponse.status !== 404) {
                return withSecurityHeaders(request, directAssetResponse, pathname);
            }
        }

        if (
            !hasExtension
            && isHtmlNavigation(request)
            && pathname.startsWith('/stories/')
            && isCrawlerNavigation(request)
        ) {
            const seoResponse = await runStorySeoHandler(request, env, pathname, assets);
            if (seoResponse) {
                return withSecurityHeaders(request, seoResponse, pathname);
            }
        }

        if (!hasExtension && isHtmlNavigation(request) && isKnownSpaRoute(pathname)) {
            const indexResponse = await assets.fetch(createAssetRequest(request, '/index.html'));
            if (indexResponse.status !== 404) {
                return withSecurityHeaders(
                    request,
                    new Response(method === 'HEAD' ? null : indexResponse.body, {
                        status: 200,
                        headers: indexResponse.headers
                    }),
                    pathname
                );
            }
        }

        const notFoundResponse = await assets.fetch(createAssetRequest(request, '/404.html'));
        if (notFoundResponse.status !== 404) {
            return withSecurityHeaders(
                request,
                new Response(method === 'HEAD' ? null : notFoundResponse.body, {
                    status: 404,
                    headers: notFoundResponse.headers
                }),
                pathname
            );
        }

        return withSecurityHeaders(
            request,
            new Response('Not Found', {
                status: 404,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                }
            }),
            pathname
        );
    }
};
