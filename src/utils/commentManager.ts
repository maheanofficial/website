import { buildServerAuthHeaders } from './serverAuth';

export type StoryComment = {
    id: string;
    storyId: string;
    storySlug?: string;
    parentId?: string;
    partNumber?: number | null;
    userId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
};

export type CommentReport = {
    id: string;
    commentId: string;
    storyId: string;
    storySlug?: string;
    reporterId: string;
    reporterName: string;
    reason: string;
    details?: string;
    status: 'open' | 'resolved' | 'dismissed';
    createdAt: string;
    updatedAt?: string;
};

type CommentApiResponse = {
    comments?: StoryComment[];
    comment?: StoryComment;
    reports?: CommentReport[];
    report?: CommentReport;
    totalComments?: number;
    deletedCommentId?: string;
    error?: string;
};

const toTrimmedString = (value: unknown) => String(value || '').trim();

const normalizeComment = (value: unknown): StoryComment | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const record = value as Record<string, unknown>;
    const id = toTrimmedString(record.id);
    const storyId = toTrimmedString(record.storyId);
    const content = toTrimmedString(record.content);

    if (!id || !storyId || !content) {
        return null;
    }

    const parsedPartNumber = Number.parseInt(String(record.partNumber || '').trim(), 10);

    return {
        id,
        storyId,
        storySlug: toTrimmedString(record.storySlug) || undefined,
        parentId: toTrimmedString(record.parentId) || undefined,
        partNumber: Number.isFinite(parsedPartNumber) && parsedPartNumber > 0 ? parsedPartNumber : null,
        userId: toTrimmedString(record.userId),
        authorName: toTrimmedString(record.authorName) || 'Reader',
        authorAvatar: toTrimmedString(record.authorAvatar) || undefined,
        content,
        createdAt: toTrimmedString(record.createdAt) || new Date().toISOString(),
        updatedAt: toTrimmedString(record.updatedAt) || undefined
    };
};

const normalizeReport = (value: unknown): CommentReport | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const id = toTrimmedString(record.id);
    const commentId = toTrimmedString(record.commentId);
    const storyId = toTrimmedString(record.storyId);
    const reason = toTrimmedString(record.reason);
    if (!id || !commentId || !storyId || !reason) return null;

    const statusRaw = toTrimmedString(record.status).toLowerCase();
    const status: CommentReport['status'] = statusRaw === 'resolved' || statusRaw === 'dismissed'
        ? statusRaw
        : 'open';

    return {
        id,
        commentId,
        storyId,
        storySlug: toTrimmedString(record.storySlug) || undefined,
        reporterId: toTrimmedString(record.reporterId),
        reporterName: toTrimmedString(record.reporterName) || 'Reader',
        reason,
        details: toTrimmedString(record.details) || undefined,
        status,
        createdAt: toTrimmedString(record.createdAt) || new Date().toISOString(),
        updatedAt: toTrimmedString(record.updatedAt) || undefined
    };
};

const parseCommentList = (value: unknown) =>
    (Array.isArray(value) ? value : [])
        .map(normalizeComment)
        .filter((comment): comment is StoryComment => Boolean(comment));

const parseReportList = (value: unknown) =>
    (Array.isArray(value) ? value : [])
        .map(normalizeReport)
        .filter((report): report is CommentReport => Boolean(report));

const readJson = async (response: Response): Promise<CommentApiResponse> => {
    try {
        return await response.json() as CommentApiResponse;
    } catch {
        return {};
    }
};

export const getStoryComments = async (storyId: string) => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'list',
            storyId
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load comments.');
    }

    return parseCommentList(payload.comments);
};

export const getMyStoryComments = async () => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'list-mine'
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load your comments.');
    }

    return parseCommentList(payload.comments);
};

export const createStoryComment = async (input: {
    storyId: string;
    storySlug?: string;
    parentId?: string;
    partNumber?: number;
    content: string;
}) => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'create',
            storyId: input.storyId,
            storySlug: input.storySlug,
            parentId: input.parentId,
            partNumber: input.partNumber,
            content: input.content
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to save comment.');
    }

    const comment = normalizeComment(payload.comment);
    if (!comment) {
        throw new Error('Comment response was invalid.');
    }

    return {
        comment,
        totalComments: Number(payload.totalComments) || 0
    };
};

export const updateStoryComment = async (input: {
    commentId: string;
    storyId: string;
    content: string;
}) => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'update',
            commentId: input.commentId,
            storyId: input.storyId,
            content: input.content
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to update comment.');
    }

    const comment = normalizeComment(payload.comment);
    if (!comment) {
        throw new Error('Comment response was invalid.');
    }

    return {
        comment,
        totalComments: Number(payload.totalComments) || 0
    };
};

export const deleteStoryComment = async (input: {
    commentId: string;
    storyId: string;
}) => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'delete',
            commentId: input.commentId,
            storyId: input.storyId
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete comment.');
    }

    return {
        deletedCommentId: toTrimmedString(payload.deletedCommentId) || input.commentId,
        totalComments: Number(payload.totalComments) || 0
    };
};

export const reportStoryComment = async (input: {
    commentId: string;
    storyId: string;
    reason: string;
    details?: string;
}) => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'report',
            commentId: input.commentId,
            storyId: input.storyId,
            reason: input.reason,
            details: input.details
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to report comment.');
    }

    return normalizeReport(payload.report);
};

export const getReportedComments = async () => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'list-reported'
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load reported comments.');
    }

    return parseReportList(payload.reports);
};

export const resolveCommentReport = async (input: {
    reportId: string;
    status?: 'resolved' | 'dismissed';
    deleteComment?: boolean;
}) => {
    const response = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            action: 'resolve-report',
            reportId: input.reportId,
            status: input.status || 'resolved',
            deleteComment: Boolean(input.deleteComment)
        })
    });

    const payload = await readJson(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to resolve report.');
    }

    return {
        success: true,
        reportId: input.reportId
    };
};
