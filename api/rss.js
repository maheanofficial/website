import { listPublicStoryRows } from './_public-story-rows.js';

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const val = process.env[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return '';
};

const SITE_URL = (() => {
    const raw = pickFirstEnv('SITE_URL', 'VITE_SITE_URL') || 'https://www.mahean.com';
    return raw.replace(/\/+$/, '');
})();

const escapeXml = (str) =>
    String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toRfc822 = (dateStr) => {
    try {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return new Date().toUTCString();
        return d.toUTCString();
    } catch {
        return new Date().toUTCString();
    }
};

const stripHtml = (html) =>
    String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
    try {
        const stories = await listPublicStoryRows({ columns: 'id,title,slug,excerpt,category,author,date,created_at,cover_image,image,status' });
        const sorted = (Array.isArray(stories) ? stories : [])
            .sort((a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime())
            .slice(0, 50);

        const items = sorted.map((s) => {
            const slug = s.slug || s.id;
            const url = `${SITE_URL}/stories/${encodeURIComponent(slug)}`;
            const coverUrl = s.cover_image || s.image || '';
            const excerpt = stripHtml(s.excerpt || '').slice(0, 300);
            const enclosure = coverUrl
                ? `<enclosure url="${escapeXml(coverUrl.startsWith('http') ? coverUrl : `${SITE_URL}${coverUrl}`)}" type="image/png" length="0" />`
                : '';
            return `    <item>
      <title>${escapeXml(s.title || '')}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(excerpt)}</description>
      <pubDate>${toRfc822(s.date || s.created_at)}</pubDate>
      <category>${escapeXml(s.category || 'গল্প')}</category>
      <author>${escapeXml(s.author || 'Mahean Ahmed')}</author>
      ${enclosure}
    </item>`;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>মাহিয়ানের গল্পকথা</title>
    <link>${SITE_URL}</link>
    <description>মাহিয়ান আহমেদের বাংলা গল্প — থ্রিলার, রহস্য, সাসপেন্স এবং আরও অনেক কিছু</description>
    <language>bn-BD</language>
    <managingEditor>mahean4bd@gmail.com (Mahean Ahmed)</managingEditor>
    <webMaster>mahean4bd@gmail.com (Mahean Ahmed)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${SITE_URL}/assets/logo-solid.png</url>
      <title>মাহিয়ানের গল্পকথা</title>
      <link>${SITE_URL}</link>
    </image>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

        res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
        res.end(xml);
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('RSS feed error: ' + (error instanceof Error ? error.message : String(error)));
    }
}
