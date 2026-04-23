import { randomUUID } from 'node:crypto';

import { deleteRows, insertRows, listRows, updateRows } from './_table-store.js';
import { readSessionClaimsFromRequest } from './_auth-session.js';
import {
    consumeRateLimit,
    getClientIp,
    json,
    readJsonBody
} from './_request-utils.js';

const BODY_LIMIT_BYTES = 128 * 1024;
const READ_WINDOW_MS = 60_000;
const READ_MAX_REQUESTS = 120;
const WRITE_WINDOW_MS = 60_000;
const WRITE_MAX_REQUESTS = 30;

const ALLOWED_AUTHOR_ROLES = new Set(['author', 'admin', 'moderator', 'reader']);

const toTrimmedString = (value) => String(value || '').trim();
const toInt = (value, fallback = 0) => {
    const n = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(n) ? n : fallback;
};

const requireAuthorSession = async (req, res) => {
    const claims = await readSessionClaimsFromRequest(req);
    if (!claims?.userId) {
        json(res, 401, { error: 'Authentication required.' });
        return null;
    }
    if (!ALLOWED_AUTHOR_ROLES.has(claims.role)) {
        json(res, 403, { error: 'Author access required.' });
        return null;
    }
    return claims;
};

const normalizeStoryPayload = (body) => {
    const title = toTrimmedString(body?.title).slice(0, 300);
    const excerpt = toTrimmedString(body?.excerpt).slice(0, 1000);
    const content = toTrimmedString(body?.content).slice(0, 500000);
    const category = toTrimmedString(body?.category).slice(0, 100);
    const coverImage = toTrimmedString(body?.cover_image).slice(0, 500);
    const status = ['draft', 'pending'].includes(toTrimmedString(body?.status))
        ? toTrimmedString(body?.status)
        : 'draft';

    const rawTags = Array.isArray(body?.tags) ? body.tags : [];
    const tags = rawTags
        .map((t) => toTrimmedString(t).slice(0, 60))
        .filter(Boolean)
        .slice(0, 20);

    const rawParts = Array.isArray(body?.parts) ? body.parts : [];
    const parts = rawParts
        .map((p) => {
            if (!p || typeof p !== 'object') return null;
            const partTitle = toTrimmedString(p.title).slice(0, 200);
            const partContent = toTrimmedString(p.content).slice(0, 200000);
            if (!partTitle && !partContent) return null;
            return {
                id: toTrimmedString(p.id) || randomUUID(),
                title: partTitle,
                slug: toTrimmedString(p.slug) || undefined,
                content: partContent
            };
        })
        .filter(Boolean)
        .slice(0, 200);

    const rawSeasons = Array.isArray(body?.seasons) ? body.seasons : [];
    const seasons = rawSeasons
        .map((s) => {
            if (!s || typeof s !== 'object') return null;
            const seasonParts = Array.isArray(s.parts)
                ? s.parts.map((p) => {
                    if (!p || typeof p !== 'object') return null;
                    const pt = toTrimmedString(p.title).slice(0, 200);
                    const pc = toTrimmedString(p.content).slice(0, 200000);
                    if (!pt && !pc) return null;
                    return { id: toTrimmedString(p.id) || randomUUID(), title: pt, slug: toTrimmedString(p.slug) || undefined, content: pc };
                }).filter(Boolean)
                : [];
            if (!seasonParts.length) return null;
            return {
                id: toTrimmedString(s.id) || randomUUID(),
                title: toTrimmedString(s.title).slice(0, 100) || undefined,
                parts: seasonParts
            };
        })
        .filter(Boolean)
        .slice(0, 20);

    return { title, excerpt, content, category, coverImage, status, tags, parts, seasons };
};

const mapStoryForAuthor = (row) => ({
    id: row.id,
    title: row.title || '',
    excerpt: row.excerpt || '',
    category: row.category || '',
    cover_image: row.cover_image || row.image || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    parts: Array.isArray(row.parts) ? row.parts : [],
    seasons: Array.isArray(row.seasons) ? row.seasons : null,
    views: row.views || 0,
    comments: row.comments || 0,
    status: row.status || 'draft',
    date: row.date || row.created_at || '',
    slug: row.slug || '',
    submitted_by: row.submitted_by || row.submittedBy || ''
});

export default async function authorPortalHandler(req, res) {
    const url = new URL(req.url, `http://localhost`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase() || 'GET';
    const ip = getClientIp(req);

    // GET /api/author-portal/stories — list own stories
    if (method === 'GET' && pathname === '/api/author-portal/stories') {
        const limited = consumeRateLimit(`author-portal-read:${ip}`, READ_WINDOW_MS, READ_MAX_REQUESTS);
        if (limited) return json(res, 429, { error: 'Too many requests.' });

        const claims = await requireAuthorSession(req, res);
        if (!claims) return;

        try {
            const rows = await listRows('stories', {});
            const ownStories = rows
                .filter((r) => r.submitted_by === claims.userId || r.author_id === claims.userId)
                .map(mapStoryForAuthor)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return json(res, 200, { stories: ownStories });
        } catch {
            return json(res, 500, { error: 'Failed to load stories.' });
        }
    }

    // POST /api/author-portal/stories — create new story
    if (method === 'POST' && pathname === '/api/author-portal/stories') {
        const limited = consumeRateLimit(`author-portal-write:${ip}`, WRITE_WINDOW_MS, WRITE_MAX_REQUESTS);
        if (limited) return json(res, 429, { error: 'Too many requests.' });

        const claims = await requireAuthorSession(req, res);
        if (!claims) return;

        const body = await readJsonBody(req, BODY_LIMIT_BYTES);
        if (!body) return json(res, 400, { error: 'Invalid request body.' });

        const payload = normalizeStoryPayload(body);
        if (!payload.title) return json(res, 400, { error: 'Story title is required.' });

        const now = new Date().toISOString();
        const slugBase = payload.title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);

        const newStory = {
            id: randomUUID(),
            title: payload.title,
            excerpt: payload.excerpt,
            content: payload.content,
            author_id: claims.userId,
            author: claims.displayName || claims.email || '',
            category: payload.category,
            category_id: payload.category,
            cover_image: payload.coverImage || null,
            image: payload.coverImage || null,
            tags: payload.tags,
            parts: payload.parts,
            seasons: payload.seasons || null,
            slug: slugBase || randomUUID().slice(0, 8),
            status: payload.status,
            submitted_by: claims.userId,
            views: 0,
            comments: 0,
            is_featured: false,
            date: now,
            created_at: now,
            updated_at: now
        };

        try {
            await insertRows('stories', [newStory]);
            return json(res, 201, { story: mapStoryForAuthor(newStory) });
        } catch {
            return json(res, 500, { error: 'Failed to create story.' });
        }
    }

    // PUT /api/author-portal/stories/:id — update own story
    const storyEditMatch = pathname.match(/^\/api\/author-portal\/stories\/([^/]+)$/);
    if (method === 'PUT' && storyEditMatch) {
        const limited = consumeRateLimit(`author-portal-write:${ip}`, WRITE_WINDOW_MS, WRITE_MAX_REQUESTS);
        if (limited) return json(res, 429, { error: 'Too many requests.' });

        const claims = await requireAuthorSession(req, res);
        if (!claims) return;

        const storyId = storyEditMatch[1];
        const body = await readJsonBody(req, BODY_LIMIT_BYTES);
        if (!body) return json(res, 400, { error: 'Invalid request body.' });

        try {
            const rows = await listRows('stories', {});
            const existing = rows.find((r) => r.id === storyId);
            if (!existing) return json(res, 404, { error: 'Story not found.' });

            const isOwner = existing.submitted_by === claims.userId || existing.author_id === claims.userId;
            const isStaff = claims.role === 'admin' || claims.role === 'moderator';
            if (!isOwner && !isStaff) return json(res, 403, { error: 'Not authorized to edit this story.' });

            const payload = normalizeStoryPayload(body);
            const updated = {
                ...existing,
                title: payload.title || existing.title,
                excerpt: payload.excerpt !== undefined ? payload.excerpt : existing.excerpt,
                content: payload.content !== undefined ? payload.content : existing.content,
                category: payload.category || existing.category,
                category_id: payload.category || existing.category_id,
                cover_image: payload.coverImage || existing.cover_image,
                tags: payload.tags.length ? payload.tags : existing.tags,
                parts: payload.parts.length ? payload.parts : existing.parts,
                seasons: payload.seasons?.length ? payload.seasons : existing.seasons,
                status: payload.status || existing.status,
                updated_at: new Date().toISOString()
            };

            await updateRows('stories', { id: storyId }, updated);
            return json(res, 200, { story: mapStoryForAuthor(updated) });
        } catch {
            return json(res, 500, { error: 'Failed to update story.' });
        }
    }

    // DELETE /api/author-portal/stories/:id — delete own story (moves to trash)
    if (method === 'DELETE' && storyEditMatch) {
        const limited = consumeRateLimit(`author-portal-write:${ip}`, WRITE_WINDOW_MS, WRITE_MAX_REQUESTS);
        if (limited) return json(res, 429, { error: 'Too many requests.' });

        const claims = await requireAuthorSession(req, res);
        if (!claims) return;

        const storyId = storyEditMatch[1];

        try {
            const rows = await listRows('stories', {});
            const existing = rows.find((r) => r.id === storyId);
            if (!existing) return json(res, 404, { error: 'Story not found.' });

            const isOwner = existing.submitted_by === claims.userId || existing.author_id === claims.userId;
            const isStaff = claims.role === 'admin' || claims.role === 'moderator';
            if (!isOwner && !isStaff) return json(res, 403, { error: 'Not authorized.' });

            await deleteRows('stories', { id: storyId });
            const trashEntry = {
                id: randomUUID(),
                original_id: storyId,
                type: 'story',
                data: JSON.stringify(existing),
                name: existing.title || storyId,
                deleted_at: new Date().toISOString()
            };
            await insertRows('trash', [trashEntry]);
            return json(res, 200, { deleted: true });
        } catch {
            return json(res, 500, { error: 'Failed to delete story.' });
        }
    }

    // GET /api/author-portal/analytics — per-story analytics for author
    if (method === 'GET' && pathname === '/api/author-portal/analytics') {
        const limited = consumeRateLimit(`author-portal-read:${ip}`, READ_WINDOW_MS, READ_MAX_REQUESTS);
        if (limited) return json(res, 429, { error: 'Too many requests.' });

        const claims = await requireAuthorSession(req, res);
        if (!claims) return;

        try {
            const rows = await listRows('stories', {});
            const ownStories = rows.filter(
                (r) => r.submitted_by === claims.userId || r.author_id === claims.userId
            );
            const totalViews = ownStories.reduce((sum, s) => sum + (toInt(s.views, 0)), 0);
            const totalComments = ownStories.reduce((sum, s) => sum + (toInt(s.comments, 0)), 0);
            const totalStories = ownStories.length;
            const publishedStories = ownStories.filter((s) => s.status === 'published').length;
            const pendingStories = ownStories.filter((s) => s.status === 'pending').length;
            const draftStories = ownStories.filter((s) => s.status === 'draft').length;

            const topStories = [...ownStories]
                .sort((a, b) => toInt(b.views, 0) - toInt(a.views, 0))
                .slice(0, 5)
                .map((s) => ({
                    id: s.id,
                    title: s.title || '',
                    views: toInt(s.views, 0),
                    comments: toInt(s.comments, 0),
                    status: s.status || 'draft',
                    date: s.date || ''
                }));

            return json(res, 200, {
                totalViews,
                totalComments,
                totalStories,
                publishedStories,
                pendingStories,
                draftStories,
                topStories
            });
        } catch {
            return json(res, 500, { error: 'Failed to load analytics.' });
        }
    }

    // GET /api/author-portal/profile — get author profile
    if (method === 'GET' && pathname === '/api/author-portal/profile') {
        const limited = consumeRateLimit(`author-portal-read:${ip}`, READ_WINDOW_MS, READ_MAX_REQUESTS);
        if (limited) return json(res, 429, { error: 'Too many requests.' });

        const claims = await requireAuthorSession(req, res);
        if (!claims) return;

        try {
            const rows = await listRows('authors', {});
            const authorRow = rows.find(
                (r) => r.user_id === claims.userId || r.username === claims.username
            );
            return json(res, 200, { profile: authorRow || null });
        } catch {
            return json(res, 500, { error: 'Failed to load profile.' });
        }
    }

    return json(res, 404, { error: 'Not found.' });
}
