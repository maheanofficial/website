import { listRows } from './_table-store.js';
import { consumeRateLimit, getClientIp, json, readJsonBody } from './_request-utils.js';

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_MAX_REQUESTS = 60;
const RESULT_LIMIT = 20;
const BODY_LIMIT_BYTES = 4 * 1024;

const toWords = (text) =>
    String(text || '')
        .toLowerCase()
        .split(/[\s,،؛।,!?.()\[\]{}"':;\/\\|<>]+/)
        .filter((w) => w.length >= 2);

const scoreStory = (story, queryWords) => {
    if (!queryWords.length) return 0;
    let score = 0;
    const titleWords = toWords(story.title);
    const tagWords = toWords(Array.isArray(story.tags) ? story.tags.join(' ') : story.tags);
    const categoryWords = toWords(story.category);
    const authorWords = toWords(story.author);
    const excerptWords = toWords(story.excerpt);

    for (const qw of queryWords) {
        if (titleWords.some((w) => w.includes(qw) || qw.includes(w))) score += 10;
        if (tagWords.some((w) => w.includes(qw) || qw.includes(w))) score += 6;
        if (categoryWords.some((w) => w.includes(qw) || qw.includes(w))) score += 4;
        if (authorWords.some((w) => w.includes(qw) || qw.includes(w))) score += 3;
        if (excerptWords.some((w) => w.includes(qw) || qw.includes(w))) score += 1;
    }
    return score;
};

const toPublicStory = (story) => ({
    id: story.id,
    title: story.title,
    slug: story.slug,
    author: story.author,
    category: story.category,
    tags: story.tags,
    excerpt: story.excerpt,
    cover_image: story.cover_image || story.image,
    status: story.status,
    createdAt: story.createdAt,
    comments: story.comments
});

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    const clientIp = getClientIp(req);

    const rateLimitResult = consumeRateLimit(`search:${clientIp}`, SEARCH_MAX_REQUESTS, SEARCH_WINDOW_MS);
    if (!rateLimitResult.allowed) {
        json(res, 429, { error: 'Too many requests.' }, { 'Retry-After': String(rateLimitResult.retryAfterSec) });
        return;
    }

    let q = '';

    if (method === 'GET') {
        const baseUrl = `http://${req.headers.host || 'localhost'}`;
        const parsed = new URL(req.url || '/', baseUrl);
        q = parsed.searchParams.get('q') || '';
    } else if (method === 'POST') {
        let body;
        try {
            body = await readJsonBody(req, { maxBytes: BODY_LIMIT_BYTES });
        } catch {
            json(res, 400, { error: 'Invalid request body.' });
            return;
        }
        q = String(body?.q || '').trim();
    } else {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    q = String(q).trim();
    if (!q || q.length < 2) {
        json(res, 400, { error: 'Query must be at least 2 characters.' });
        return;
    }
    if (q.length > 200) {
        json(res, 400, { error: 'Query too long.' });
        return;
    }

    try {
        const stories = await listRows('stories', {
            filters: [{ op: 'eq', column: 'status', value: 'published' }]
        });

        const queryWords = toWords(q);
        const scored = (Array.isArray(stories) ? stories : [])
            .map((story) => ({ story, score: scoreStory(story, queryWords) }))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, RESULT_LIMIT)
            .map((entry) => ({ ...toPublicStory(entry.story), _score: entry.score }));

        json(res, 200, { results: scored, total: scored.length, q });
    } catch (error) {
        json(res, 500, { error: error instanceof Error ? error.message : 'Search failed.' });
    }
}
