import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_SITEMAP_PATH = path.join(ROOT_DIR, 'dist', 'sitemap.xml');

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
) || 'https://mahean.com';

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
        .replace(/&/g, '&')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

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

export default async function handler(req, res) {
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
    }

    try {
        const xml = await fs.readFile(DIST_SITEMAP_PATH, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.end(xml);
        return;
    } catch {
        const xml = buildFallbackSitemap();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.end(xml);
    }
}
