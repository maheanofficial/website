import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import adminUsersHandler from './api/admin-users.js';
import authHandler from './api/auth.js';
import cleanupTrashHandler from './api/cleanup-trash.js';
import dbHandler from './api/db.js';
import sitemapHandler from './api/sitemap.js';
import sitemapNewsHandler from './api/sitemap-news.js';
import storyRedirectHandler from './api/story-redirect.js';
import uploadImageHandler from './api/upload-image.js';
import { tryServeStorySeoPage } from './api/_story-seo-page.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const NOT_FOUND_HTML_PATH = path.join(DIST_DIR, '404.html');
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '';

const STATIC_SEO_SYNC_FILES = [
    { source: path.join(DIST_DIR, 'ads.txt'), fileName: 'ads.txt' },
    { source: path.join(DIST_DIR, 'sitemap.xml'), fileName: 'sitemap.xml' },
    { source: path.join(DIST_DIR, 'robots.txt'), fileName: 'robots.txt' }
];

const STATIC_SEO_TARGET_DIRS = Array.from(new Set(
    [
        process.env.STATIC_SEO_ROOT_DIR || '',
        HOME_DIR ? path.join(HOME_DIR, 'public_html') : '',
        HOME_DIR ? path.join(HOME_DIR, 'www') : '',
        path.resolve(__dirname, '..', 'public_html'),
        path.resolve(__dirname, '..', 'www')
    ].filter(Boolean)
));

const STATIC_SEO_DISCOVERY_ROOTS = Array.from(new Set(
    [
        ...STATIC_SEO_TARGET_DIRS,
        HOME_DIR,
    ].filter(Boolean)
));

const STATIC_SEO_FILE_NAMES = new Set(['ads.txt', 'sitemap.xml', 'robots.txt']);
const STATIC_SEO_DESCEND_BLOCKLIST = new Set([
    '.git',
    '.github',
    'node_modules',
    'vendor',
    'cache',
    'caches',
    'tmp',
    'temp',
    'logs',
    'log'
]);
const STATIC_SEO_SCAN_MAX_DEPTH = Number.parseInt(process.env.SEO_SYNC_SCAN_DEPTH || '', 10) || 6;
const STATIC_SEO_SCAN_MAX_DIRS = Number.parseInt(process.env.SEO_SYNC_SCAN_MAX_DIRS || '', 10) || 2000;
const STATIC_SEO_MIN_INTERVAL_MS = Number.parseInt(process.env.SEO_SYNC_MIN_INTERVAL_MS || '', 10) || 300_000;

let seoSyncInFlight = null;
let seoSyncLastRunAt = 0;
const STATIC_WEB_ROOT_PATH_PATTERN = /[\\/](public_html|www|htdocs)(?:[\\/]|$)/i;

const MIME_TYPES = {
    '.avif': 'image/avif',
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml; charset=utf-8'
};

const API_HANDLERS = new Map([
    ['/api/admin-users', adminUsersHandler],
    ['/api/auth', authHandler],
    ['/api/cleanup-trash', cleanupTrashHandler],
    ['/api/db', dbHandler],
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
    '/admin',
    '/dashboard',
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
    '/author/dashboard/'
];

const toNormalizedPathname = (pathname) => {
    const decoded = safeDecodeURIComponent(pathname || '/');
    if (decoded !== '/' && decoded.endsWith('/')) {
        return decoded.replace(/\/+$/, '');
    }
    return decoded || '/';
};

const ROBOTS_TXT = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /admin
Disallow: /author
Disallow: /dashboard
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /update-password

# Sitemaps
Sitemap: https://www.mahean.com/sitemap.xml
Sitemap: https://www.mahean.com/sitemap-news.xml
`;

const safeDecodeURIComponent = (value) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const sendText = (res, statusCode, body, contentType = 'text/plain; charset=utf-8') => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
};

const firstHeaderValue = (value) =>
    typeof value === 'string'
        ? value.split(',')[0].trim()
        : '';

const requestIsSecure = (req) => {
    const forwardedProto = firstHeaderValue(req.headers?.['x-forwarded-proto']).toLowerCase();
    if (forwardedProto === 'https') {
        return true;
    }
    if (forwardedProto === 'http') {
        return false;
    }
    return Boolean(req.socket?.encrypted);
};

const applySecurityHeaders = (req, res) => {
    if (res.headersSent) return;
    if (!res.hasHeader('X-Content-Type-Options')) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    if (!res.hasHeader('X-Frame-Options')) {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    if (!res.hasHeader('Referrer-Policy')) {
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
    if (!res.hasHeader('Permissions-Policy')) {
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }
    if (!res.hasHeader('Strict-Transport-Security') && requestIsSecure(req)) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    if (!res.hasHeader('Cross-Origin-Resource-Policy')) {
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
    if (!res.hasHeader('Cross-Origin-Opener-Policy')) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    }
    if (!res.hasHeader('X-DNS-Prefetch-Control')) {
        res.setHeader('X-DNS-Prefetch-Control', 'off');
    }
    if (!res.hasHeader('X-Permitted-Cross-Domain-Policies')) {
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    }
};

const existsFile = async (filePath) => {
    try {
        const stat = await fsp.stat(filePath);
        return stat.isFile() ? stat : null;
    } catch {
        return null;
    }
};

const toMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
};

const toCacheControl = (filePath) => {
    if (filePath.endsWith('.html')) {
        return 'no-cache';
    }

    const relative = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');
    const isHashedAsset = relative.startsWith('assets/')
        && /\.[a-f0-9]{8,}\./i.test(path.basename(relative));

    if (isHashedAsset) {
        return 'public, max-age=31536000, immutable';
    }

    return 'public, max-age=3600';
};

const toEtag = (stat) =>
    `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;

const isNotModified = (req, stat, etag) => {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        return false;
    }

    const ifNoneMatch = typeof req.headers['if-none-match'] === 'string'
        ? req.headers['if-none-match'].trim()
        : '';
    if (ifNoneMatch && ifNoneMatch === etag) {
        return true;
    }

    const ifModifiedSince = typeof req.headers['if-modified-since'] === 'string'
        ? Date.parse(req.headers['if-modified-since'])
        : NaN;
    if (!Number.isNaN(ifModifiedSince) && stat.mtimeMs <= (ifModifiedSince + 1000)) {
        return true;
    }

    return false;
};

const serveFile = async (req, res, filePath, statusCode = 200) => {
    const stat = await existsFile(filePath);
    if (!stat) {
        return false;
    }

    const etag = toEtag(stat);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', toMimeType(filePath));
    res.setHeader('Cache-Control', toCacheControl(filePath));
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
    res.setHeader('ETag', etag);

    if (statusCode === 200 && isNotModified(req, stat, etag)) {
        res.statusCode = 304;
        res.removeHeader('Content-Length');
        res.end();
        return true;
    }

    res.setHeader('Content-Length', stat.size);

    if ((req.method || 'GET').toUpperCase() === 'HEAD') {
        res.end();
        return true;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', (error) => {
        if (!res.headersSent) {
            sendText(res, 500, 'Failed to read static file.');
        } else {
            res.destroy(error);
        }
    });
    stream.pipe(res);
    return true;
};

const runHandler = async (req, res, handler, rewrittenUrl) => {
    const originalUrl = req.url;
    if (rewrittenUrl) {
        req.url = rewrittenUrl;
    }

    try {
        await handler(req, res);
    } catch (error) {
        console.error('API handler failed:', error);
        if (!res.headersSent) {
            sendText(res, 500, 'Internal Server Error');
        } else {
            res.end();
        }
    } finally {
        req.url = originalUrl;
    }
};

const isHtmlNavigation = (req) => {
    const acceptHeader = typeof req.headers.accept === 'string'
        ? req.headers.accept
        : '';
    if (!acceptHeader) return true;
    return acceptHeader.includes('text/html') || acceptHeader.includes('*/*');
};

const isKnownSpaRoute = (pathname) =>
    SPA_EXACT_PATHS.has(pathname)
    || SPA_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));

const normalizeFsPath = (value) => path.resolve(String(value || ''));

const shouldDescendDirectory = (parentDir, entryName, depth) => {
    const normalizedName = String(entryName || '').trim();
    if (!normalizedName) return false;
    const lowerName = normalizedName.toLowerCase();
    if (lowerName.startsWith('.')) return false;
    if (STATIC_SEO_DESCEND_BLOCKLIST.has(lowerName)) return false;

    if (depth <= 1) return true;

    const parentLower = String(parentDir || '').toLowerCase();
    const relevantPattern = /(public_html|www|htdocs|mahean|domain|site|web)/i;
    if (relevantPattern.test(lowerName) || relevantPattern.test(parentLower)) {
        return true;
    }

    return depth <= 3;
};

const discoverExistingSeoTargets = async () => {
    const discoveredByFile = new Map();
    STATIC_SEO_FILE_NAMES.forEach((fileName) => {
        discoveredByFile.set(fileName, new Set());
    });

    const queue = STATIC_SEO_DISCOVERY_ROOTS
        .map((dirPath) => ({
            dirPath: normalizeFsPath(dirPath),
            depth: 0
        }));
    const visitedDirs = new Set();

    while (queue.length > 0 && visitedDirs.size < STATIC_SEO_SCAN_MAX_DIRS) {
        const next = queue.shift();
        if (!next?.dirPath) continue;

        const currentDir = next.dirPath;
        if (visitedDirs.has(currentDir)) continue;
        visitedDirs.add(currentDir);

        let entries;
        try {
            const stat = await fsp.stat(currentDir);
            if (!stat.isDirectory()) continue;
            entries = await fsp.readdir(currentDir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            if (entry.isFile()) {
                const lowerFileName = entry.name.toLowerCase();
                if (!STATIC_SEO_FILE_NAMES.has(lowerFileName)) continue;
                const fullPath = path.join(currentDir, entry.name);
                const normalizedPath = normalizeFsPath(fullPath);
                if (!STATIC_WEB_ROOT_PATH_PATTERN.test(normalizedPath)) continue;
                discoveredByFile.get(lowerFileName)?.add(normalizedPath);
                continue;
            }

            if (!entry.isDirectory()) continue;
            if (next.depth >= STATIC_SEO_SCAN_MAX_DEPTH) continue;
            if (!shouldDescendDirectory(currentDir, entry.name, next.depth)) continue;

            queue.push({
                dirPath: normalizeFsPath(path.join(currentDir, entry.name)),
                depth: next.depth + 1
            });
        }
    }

    return discoveredByFile;
};

const syncStaticSeoFiles = async () => {
    const sourcePayloadByName = new Map();
    const sourcePathsByName = new Map();

    for (const entry of STATIC_SEO_SYNC_FILES) {
        const lowerFileName = entry.fileName.toLowerCase();
        if (!STATIC_SEO_FILE_NAMES.has(lowerFileName)) continue;
        try {
            const payload = await fsp.readFile(entry.source);
            sourcePayloadByName.set(lowerFileName, payload);
            sourcePathsByName.set(lowerFileName, normalizeFsPath(entry.source));
        } catch {
            // Ignore missing source assets.
        }
    }

    if (sourcePayloadByName.size === 0) {
        return;
    }

    const targetFiles = new Map();
    sourcePayloadByName.forEach((_, fileName) => {
        targetFiles.set(fileName, new Set());
    });

    for (const targetDir of STATIC_SEO_TARGET_DIRS) {
        let stat = null;
        try {
            stat = await fsp.stat(targetDir);
        } catch {
            continue;
        }
        if (!stat?.isDirectory()) continue;

        sourcePayloadByName.forEach((_, fileName) => {
            targetFiles.get(fileName)?.add(normalizeFsPath(path.join(targetDir, fileName)));
        });
    }

    const discoveredTargets = await discoverExistingSeoTargets();
    discoveredTargets.forEach((paths, fileName) => {
        const collection = targetFiles.get(fileName);
        if (!collection) return;
        paths.forEach((targetPath) => collection.add(normalizeFsPath(targetPath)));
    });

    for (const [fileName, paths] of targetFiles.entries()) {
        const payload = sourcePayloadByName.get(fileName);
        const sourcePath = sourcePathsByName.get(fileName);
        if (!payload || !sourcePath) continue;

        for (const targetPath of paths) {
            if (!targetPath || targetPath === sourcePath) continue;
            try {
                await fsp.writeFile(targetPath, payload);
            } catch (error) {
                console.warn(`[seo-sync] Failed to sync ${fileName} to ${targetPath}:`, error?.message || error);
            }
        }
    }
};

const triggerSeoSync = (force = false) => {
    const now = Date.now();
    if (!force && seoSyncLastRunAt && (now - seoSyncLastRunAt) < STATIC_SEO_MIN_INTERVAL_MS) {
        return seoSyncInFlight;
    }

    if (seoSyncInFlight) {
        return seoSyncInFlight;
    }

    seoSyncLastRunAt = now;
    seoSyncInFlight = syncStaticSeoFiles()
        .catch((error) => {
            console.warn('[seo-sync] Static SEO sync failed:', error?.message || error);
        })
        .finally(() => {
            seoSyncInFlight = null;
        });

    return seoSyncInFlight;
};

const handleRequest = async (req, res) => {
    applySecurityHeaders(req, res);

    const baseUrl = `http://${req.headers.host || 'localhost'}`;
    const parsed = new URL(req.url || '/', baseUrl);
    const pathname = toNormalizedPathname(parsed.pathname);
    const method = (req.method || 'GET').toUpperCase();

    if (pathname === '/healthz') {
        void triggerSeoSync(false);
        sendText(res, 200, 'ok');
        return;
    }

    if (pathname === '/robots.txt') {
        sendText(res, 200, ROBOTS_TXT, 'text/plain; charset=utf-8');
        return;
    }

    const directApiHandler = API_HANDLERS.get(pathname);
    if (directApiHandler) {
        await runHandler(req, res, directApiHandler);
        return;
    }

    if (pathname === '/sitemap.xml') {
        await runHandler(req, res, sitemapHandler);
        return;
    }

    if (pathname === '/sitemap-news.xml') {
        await runHandler(req, res, sitemapNewsHandler);
        return;
    }

    if (method !== 'GET' && method !== 'HEAD') {
        sendText(res, 405, 'Method Not Allowed');
        return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const candidatePath = path.resolve(path.join(DIST_DIR, `.${requestedPath}`));
    const candidateDirectoryIndexPath = path.resolve(
        path.join(DIST_DIR, `.${pathname}`, 'index.html')
    );

    if (!candidatePath.startsWith(DIST_DIR) || !candidateDirectoryIndexPath.startsWith(DIST_DIR)) {
        sendText(res, 403, 'Forbidden');
        return;
    }

    if (await serveFile(req, res, candidatePath, 200)) {
        return;
    }

    // Serve prerendered route pages such as /about -> dist/about/index.html
    if (await serveFile(req, res, candidateDirectoryIndexPath, 200)) {
        return;
    }

    const hasExtension = Boolean(path.extname(pathname));
    if (!hasExtension && isHtmlNavigation(req) && pathname.startsWith('/stories/')) {
        const servedStorySeoPage = await tryServeStorySeoPage({
            req,
            res,
            pathname,
            indexHtmlPath: INDEX_HTML_PATH
        });
        if (servedStorySeoPage) {
            return;
        }
    }

    if (!hasExtension && isHtmlNavigation(req) && isKnownSpaRoute(pathname)) {
        if (await serveFile(req, res, INDEX_HTML_PATH, 200)) {
            return;
        }
    }

    if (await serveFile(req, res, NOT_FOUND_HTML_PATH, 404)) {
        return;
    }

    sendText(res, 404, 'Not Found');
};

const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
        console.error('Request handling failed:', error);
        if (!res.headersSent) {
            applySecurityHeaders(req, res);
            sendText(res, 500, 'Internal Server Error');
            return;
        }
        res.end();
    });
});

server.requestTimeout = 60_000;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 5_000;

const port = Number.parseInt(process.env.PORT || '', 10) || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    void triggerSeoSync(true);
});
