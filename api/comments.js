import { randomUUID } from 'node:crypto';

import { deleteRows, insertRows, listRows, updateRows } from './_table-store.js';
import { readUsers } from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    isTrustedOrigin,
    json,
    readJsonBody
} from './_request-utils.js';
import { readSessionClaimsFromRequest } from './_auth-session.js';

const BODY_LIMIT_BYTES = 32 * 1024;
const READ_WINDOW_MS = 60_000;
const READ_MAX_REQUESTS = 240;
const WRITE_WINDOW_MS = 60_000;
const WRITE_MAX_REQUESTS = 40;
const COMMENT_MAX_LENGTH = 1200;
const REPORT_REASON_MAX_LENGTH = 120;
const REPORT_DETAILS_MAX_LENGTH = 500;

const toTrimmedString = (value) => String(value || '').trim();

const normalizeStoryId = (value) => toTrimmedString(value);
const normalizeCommentId = (value) => toTrimmedString(value);
const normalizeReportId = (value) => toTrimmedString(value);

const normalizeStorySlug = (value) => {
    const slug = toTrimmedString(value);
    return slug || '';
};

const normalizeCommentBody = (value) =>
    String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u0000/g, '')
        .trim()
        .slice(0, COMMENT_MAX_LENGTH);

const normalizePartNumber = (value) => {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};

const normalizeReportReason = (value) =>
    toTrimmedString(value)
        .slice(0, REPORT_REASON_MAX_LENGTH);

const normalizeReportDetails = (value) =>
    String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u0000/g, '')
        .trim()
        .slice(0, REPORT_DETAILS_MAX_LENGTH);

const mapCommentRow = (row) => ({
    id: toTrimmedString(row?.id),
    storyId: normalizeStoryId(row?.storyId),
    storySlug: normalizeStorySlug(row?.storySlug),
    parentId: normalizeCommentId(row?.parentId) || '',
    partNumber: normalizePartNumber(row?.partNumber),
    userId: toTrimmedString(row?.userId),
    userIp: toTrimmedString(row?.userIp) || '',
    deviceId: toTrimmedString(row?.deviceId) || '',
    authorName: toTrimmedString(row?.authorName) || 'Reader',
    authorAvatar: toTrimmedString(row?.authorAvatar) || '',
    content: normalizeCommentBody(row?.content),
    createdAt: toTrimmedString(row?.createdAt) || new Date().toISOString(),
    updatedAt: toTrimmedString(row?.updatedAt) || ''
});

const resolveActorFromSession = async (req) => {
    const claims = readSessionClaimsFromRequest(req);
    if (!claims?.userId) {
        return null;
    }

    const users = await readUsers();
    const actor = users.find((user) => user.id === claims.userId);
    if (!actor) {
        return null;
    }

    return {
        id: actor.id,
        authorName: toTrimmedString(actor.displayName) || toTrimmedString(actor.username) || 'Reader',
        authorAvatar: toTrimmedString(actor.photoURL),
        role: actor.role === 'admin' ? 'admin' : (actor.role === 'moderator' ? 'moderator' : 'reader')
    };
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) {
        return true;
    }

    json(res, 429, { error: 'Too many requests.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const listCommentsForStory = async (storyId) => {
    const rows = await listRows('comments', {
        filters: [{ op: 'eq', column: 'storyId', value: storyId }],
        orderBy: { column: 'createdAt', ascending: false }
    });

    return (Array.isArray(rows) ? rows : [])
        .map(mapCommentRow)
        .filter((row) => row.storyId && row.content);
};

const listCommentsForUser = async (userId) => {
    const rows = await listRows('comments', {
        filters: [{ op: 'eq', column: 'userId', value: userId }],
        orderBy: { column: 'createdAt', ascending: false }
    });

    return (Array.isArray(rows) ? rows : [])
        .map(mapCommentRow)
        .filter((row) => row.storyId && row.content);
};

const findCommentById = async (commentId) => {
    const row = await listRows('comments', {
        filters: [{ op: 'eq', column: 'id', value: commentId }],
        single: true
    });

    const comment = mapCommentRow(row);
    if (!comment.id || !comment.storyId) {
        return null;
    }
    return comment;
};

const canManageComment = (actor, comment) => {
    if (!actor || !comment) {
        return false;
    }

    if (actor.role === 'admin') {
        return true;
    }

    return comment.userId === actor.id;
};

const canModerateReports = (actor) => actor?.role === 'admin' || actor?.role === 'moderator';

const mapReportRow = (row) => ({
    id: normalizeReportId(row?.id),
    commentId: normalizeCommentId(row?.commentId),
    storyId: normalizeStoryId(row?.storyId),
    storySlug: normalizeStorySlug(row?.storySlug),
    reporterId: toTrimmedString(row?.reporterId),
    reporterName: toTrimmedString(row?.reporterName) || 'Reader',
    reason: normalizeReportReason(row?.reason),
    details: normalizeReportDetails(row?.details),
    status: ['open', 'resolved', 'dismissed'].includes(toTrimmedString(row?.status).toLowerCase())
        ? toTrimmedString(row?.status).toLowerCase()
        : 'open',
    createdAt: toTrimmedString(row?.createdAt) || new Date().toISOString(),
    updatedAt: toTrimmedString(row?.updatedAt) || ''
});

const listOpenReports = async () => {
    const rows = await listRows('comment_reports', {
        filters: [{ op: 'eq', column: 'status', value: 'open' }],
        orderBy: { column: 'createdAt', ascending: false }
    });
    return (Array.isArray(rows) ? rows : [])
        .map(mapReportRow)
        .filter((row) => row.id && row.commentId && row.storyId);
};

const findReportById = async (reportId) => {
    const row = await listRows('comment_reports', {
        filters: [{ op: 'eq', column: 'id', value: reportId }],
        single: true
    });
    const report = mapReportRow(row);
    if (!report.id || !report.commentId) return null;
    return report;
};

const syncStoryCommentCount = async (storyId, storySlug, totalComments) => {
    if (!storyId && !storySlug) return;

    const filters = storyId
        ? [{ op: 'eq', column: 'id', value: storyId }]
        : [{ op: 'eq', column: 'slug', value: storySlug }];

    await updateRows('stories', { comments: totalComments }, filters);
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    const clientIp = getClientIp(req);

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: BODY_LIMIT_BYTES });
    } catch (error) {
        json(res, Number(error?.statusCode) || 400, {
            error: error?.message || 'Invalid JSON body.'
        });
        return;
    }

    const action = toTrimmedString(body.action || 'list').toLowerCase();

    if (action === 'list') {
        const storyId = normalizeStoryId(body.storyId);
        if (!storyId) {
            json(res, 400, { error: 'storyId is required.' });
            return;
        }

        if (!applyRateLimit(res, `comments:list:${clientIp}`, READ_MAX_REQUESTS, READ_WINDOW_MS)) {
            return;
        }

        try {
            const comments = await listCommentsForStory(storyId);
            json(res, 200, { comments });
        } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : 'Failed to load comments.' });
        }
        return;
    }

    if (action === 'list-mine') {
        if (!applyRateLimit(res, `comments:list-mine:${clientIp}`, READ_MAX_REQUESTS, READ_WINDOW_MS)) {
            return;
        }

        if (!isTrustedOrigin(req)) {
            json(res, 403, { error: 'Cross-site request blocked.' });
            return;
        }

        const actor = await resolveActorFromSession(req);
        if (!actor) {
            json(res, 401, { error: 'Login required to view comments.' });
            return;
        }

        try {
            const comments = await listCommentsForUser(actor.id);
            json(res, 200, { comments });
        } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : 'Failed to load comments.' });
        }
        return;
    }

    if (action === 'list-reported') {
        if (!applyRateLimit(res, `comments:list-reported:${clientIp}`, READ_MAX_REQUESTS, READ_WINDOW_MS)) {
            return;
        }

        if (!isTrustedOrigin(req)) {
            json(res, 403, { error: 'Cross-site request blocked.' });
            return;
        }

        const actor = await resolveActorFromSession(req);
        if (!canModerateReports(actor)) {
            json(res, 403, { error: 'Only moderator or admin can review reports.' });
            return;
        }

        try {
            const reports = await listOpenReports();
            json(res, 200, { reports });
        } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : 'Failed to load reports.' });
        }
        return;
    }

    if (action === 'resolve-report') {
        if (!applyRateLimit(res, `comments:resolve-report:${clientIp}`, WRITE_MAX_REQUESTS, WRITE_WINDOW_MS)) {
            return;
        }

        if (!isTrustedOrigin(req)) {
            json(res, 403, { error: 'Cross-site request blocked.' });
            return;
        }

        const actor = await resolveActorFromSession(req);
        if (!canModerateReports(actor)) {
            json(res, 403, { error: 'Only moderator or admin can resolve reports.' });
            return;
        }

        const reportId = normalizeReportId(body.reportId);
        const nextStatus = ['resolved', 'dismissed'].includes(toTrimmedString(body.status).toLowerCase())
            ? toTrimmedString(body.status).toLowerCase()
            : 'resolved';
        if (!reportId) {
            json(res, 400, { error: 'reportId is required.' });
            return;
        }

        try {
            const existingReport = await findReportById(reportId);
            if (!existingReport) {
                json(res, 404, { error: 'Report not found.' });
                return;
            }

            await updateRows(
                'comment_reports',
                {
                    status: nextStatus,
                    updatedAt: new Date().toISOString(),
                    resolvedBy: actor.id
                },
                [{ op: 'eq', column: 'id', value: reportId }]
            );

            if (Boolean(body.deleteComment)) {
                await deleteRows('comments', [{ op: 'eq', column: 'id', value: existingReport.commentId }]);
                await deleteRows('comments', [{ op: 'eq', column: 'parentId', value: existingReport.commentId }]);
                const comments = await listCommentsForStory(existingReport.storyId);
                await syncStoryCommentCount(existingReport.storyId, existingReport.storySlug, comments.length);
            }

            json(res, 200, { success: true, reportId, status: nextStatus });
        } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : 'Failed to resolve report.' });
        }
        return;
    }

    if (!['create', 'update', 'delete', 'report'].includes(action)) {
        json(res, 400, { error: 'Unsupported action.' });
        return;
    }

    const storyId = normalizeStoryId(body.storyId);
    if (!storyId) {
        json(res, 400, { error: 'storyId is required.' });
        return;
    }

    if (!applyRateLimit(res, `comments:write:${clientIp}`, WRITE_MAX_REQUESTS, WRITE_WINDOW_MS)) {
        return;
    }

    if (!isTrustedOrigin(req)) {
        json(res, 403, { error: 'Cross-site request blocked.' });
        return;
    }

    const actor = await resolveActorFromSession(req);

    try {
        if (action === 'create') {
            const content = normalizeCommentBody(body.content);
            if (!content) {
                json(res, 400, { error: 'Comment cannot be empty.' });
                return;
            }

            // 1. Honeypot Trap
            if (body.website || body.hp || body.email_hp) {
                json(res, 200, { comment: { id: randomUUID(), content, authorName: 'Guest' }, totalComments: 1 });
                return;
            }

            // 2. Form Submission Speed Test (Form loaded < 2.5s ago = bot)
            if (!actor && body.formLoadedAt) {
                const elapsed = Date.now() - Number(body.formLoadedAt);
                if (elapsed < 2200) {
                    json(res, 429, { error: 'খুব দ্রুত মন্তব্য পাঠানো হয়েছে। অনুগ্রহ করে ২ সেকেন্ড অপেক্ষা করে আবার পাঠান।' });
                    return;
                }
            }

            // 3. Content Length & Repeated Character Spam Filter
            if (content.length < 2) {
                json(res, 400, { error: 'মন্তব্য অত্যন্ত ছোট। অন্তত ২ অক্ষরের মন্তব্য লিখুন।' });
                return;
            }
            if (content.length > 1200) {
                json(res, 400, { error: 'মন্তব্য ১২০০ অক্ষরের বেশি হতে পারবে না।' });
                return;
            }
            if (/([a-zA-Z0-9\u0980-\u09FF])\1{9,}/.test(content)) {
                json(res, 400, { error: 'স্প্যাম বা অসংলগ্ন টাইপিং গ্রহণযোগ্য নয়।' });
                return;
            }

            // 4. Guest URL & Link Spam Protection
            if (!actor) {
                const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|org|net|xyz|online|top|info|site|me|io|tk|cf|gq))/i;
                if (urlPattern.test(content) || urlPattern.test(body.guestName || '')) {
                    json(res, 400, { error: 'অতিথি পাঠকদের মন্তব্যে কোনো ওয়েবসাইট লিঙ্ক গ্রহণযোগ্য নয়। লিঙ্ক দিতে লগইন করুন।' });
                    return;
                }
            }

            // 5. Guest IP Cooldown (Max 1 comment per 25 seconds per IP)
            if (!actor) {
                const clientIp = req.headers?.['cf-connecting-ip'] || req.headers?.['x-forwarded-for'] || 'guest_ip';
                const now = Date.now();
                if (!globalThis._guestCommentRateLimitMap) {
                    globalThis._guestCommentRateLimitMap = new Map();
                }
                const lastTime = globalThis._guestCommentRateLimitMap.get(clientIp) || 0;
                if (now - lastTime < 25000) {
                    const waitSec = Math.ceil((25000 - (now - lastTime)) / 1000);
                    json(res, 429, { error: `স্প্যাম প্রতিরোধে আরও ${waitSec} সেকেন্ড পর পুনরায় মন্তব্য পাঠান।` });
                    return;
                }
                globalThis._guestCommentRateLimitMap.set(clientIp, now);
                if (globalThis._guestCommentRateLimitMap.size > 2000) {
                    globalThis._guestCommentRateLimitMap.clear();
                }
            }

            const storySlug = normalizeStorySlug(body.storySlug);
            const parentId = normalizeCommentId(body.parentId);
            if (parentId) {
                const parentComment = await findCommentById(parentId);
                if (!parentComment || parentComment.storyId !== storyId) {
                    json(res, 400, { error: 'Invalid parent comment.' });
                    return;
                }
            }

            const clientIp = getClientIp(req) || req.headers?.['cf-connecting-ip'] || req.headers?.['x-forwarded-for'] || 'guest_ip';
            const deviceId = toTrimmedString(body.deviceId);

            // 6. Monthly Comment Limit (1 comment per story per 30 days per IP & Device)
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const storyCommentsList = await listCommentsForStory(storyId);
            const nowMs = Date.now();

            const existingMonthlyComment = storyCommentsList.find((c) => {
                const commentTime = new Date(c.createdAt).getTime();
                if (Number.isNaN(commentTime)) return false;
                const diff = nowMs - commentTime;
                if (diff >= THIRTY_DAYS_MS) return false;

                const sameUser = actor && c.userId && c.userId === actor.id;
                const sameIp = clientIp && c.userIp && c.userIp === clientIp;
                const sameDev = deviceId && c.deviceId && c.deviceId === deviceId;

                return sameUser || sameIp || sameDev;
            });

            if (existingMonthlyComment) {
                const commentDate = new Date(existingMonthlyComment.createdAt);
                const nextAllowedDate = new Date(commentDate.getTime() + THIRTY_DAYS_MS);
                const dateFormatted = nextAllowedDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

                json(res, 429, {
                    error: `আপনি এই গল্পে চলতি মাসে ইতিমধ্যে ১টি মন্তব্য করেছেন। একই গল্পে মাসে ১টির বেশি মন্তব্য করা যাবে না। আগামী ${dateFormatted} তারিখের পর পুনরায় মন্তব্য করতে পারবেন।`
                });
                return;
            }

            const guestName = normalizeCommentBody(body.guestName) || normalizeCommentBody(body.authorName);
            const authorName = actor?.authorName || guestName || 'অতিথি পাঠক';
            const userId = actor?.id || `guest_${randomUUID().slice(0, 8)}`;
            const authorAvatar = actor?.authorAvatar;

            const comment = mapCommentRow({
                id: randomUUID(),
                storyId,
                storySlug,
                parentId,
                partNumber: normalizePartNumber(body.partNumber),
                userId,
                userIp: clientIp,
                deviceId,
                authorName,
                authorAvatar,
                content,
                createdAt: new Date().toISOString()
            });

            await insertRows('comments', comment);
            const comments = await listCommentsForStory(storyId);
            await syncStoryCommentCount(storyId, storySlug, comments.length);

            json(res, 200, {
                comment,
                totalComments: comments.length
            });
            return;
        }

        if (!actor) {
            json(res, 401, { error: 'Login required for this action.' });
            return;
        }

        if (action === 'report') {
            const commentId = normalizeCommentId(body.commentId);
            if (!commentId) {
                json(res, 400, { error: 'commentId is required.' });
                return;
            }

            const existingComment = await findCommentById(commentId);
            if (!existingComment || existingComment.storyId !== storyId) {
                json(res, 404, { error: 'Comment not found.' });
                return;
            }

            if (existingComment.userId === actor.id && actor.role !== 'admin') {
                json(res, 400, { error: 'You cannot report your own comment.' });
                return;
            }

            const reason = normalizeReportReason(body.reason);
            if (!reason) {
                json(res, 400, { error: 'Report reason is required.' });
                return;
            }
            const details = normalizeReportDetails(body.details);

            const openDuplicate = await listRows('comment_reports', {
                filters: [
                    { op: 'eq', column: 'commentId', value: commentId },
                    { op: 'eq', column: 'reporterId', value: actor.id },
                    { op: 'eq', column: 'status', value: 'open' }
                ],
                single: true
            });

            if (openDuplicate && typeof openDuplicate === 'object') {
                json(res, 200, { success: true, duplicate: true });
                return;
            }

            const report = mapReportRow({
                id: randomUUID(),
                commentId,
                storyId,
                storySlug: existingComment.storySlug,
                reporterId: actor.id,
                reporterName: actor.authorName,
                reason,
                details,
                status: 'open',
                createdAt: new Date().toISOString()
            });

            await insertRows('comment_reports', report);
            json(res, 200, { success: true, report });
            return;
        }

        const commentId = normalizeCommentId(body.commentId);
        if (!commentId) {
            json(res, 400, { error: 'commentId is required.' });
            return;
        }

        const existingComment = await findCommentById(commentId);
        if (!existingComment || existingComment.storyId !== storyId) {
            json(res, 404, { error: 'Comment not found.' });
            return;
        }

        if (!canManageComment(actor, existingComment)) {
            json(res, 403, { error: 'You can only manage your own comments.' });
            return;
        }

        if (action === 'update') {
            const content = normalizeCommentBody(body.content);
            if (!content) {
                json(res, 400, { error: 'Comment cannot be empty.' });
                return;
            }

            await updateRows(
                'comments',
                {
                    content,
                    updatedAt: new Date().toISOString()
                },
                [{ op: 'eq', column: 'id', value: commentId }]
            );

            const updatedComment = await findCommentById(commentId);
            const comments = await listCommentsForStory(storyId);
            await syncStoryCommentCount(storyId, existingComment.storySlug, comments.length);

            json(res, 200, {
                comment: updatedComment || {
                    ...existingComment,
                    content
                },
                totalComments: comments.length
            });
            return;
        }

        await deleteRows('comments', [{ op: 'eq', column: 'id', value: commentId }]);
        await deleteRows('comments', [{ op: 'eq', column: 'parentId', value: commentId }]);
        const comments = await listCommentsForStory(storyId);
        await syncStoryCommentCount(storyId, existingComment.storySlug, comments.length);

        json(res, 200, {
            success: true,
            deletedCommentId: commentId,
            totalComments: comments.length
        });
    } catch (error) {
        const fallbackMessage = action === 'delete'
            ? 'Failed to delete comment.'
            : (action === 'update'
                ? 'Failed to update comment.'
                : (action === 'report' ? 'Failed to submit report.' : 'Failed to save comment.'));
        json(res, 500, { error: error instanceof Error ? error.message : fallbackMessage });
    }
}
