import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { readUsers } from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    json,
    readJsonBody
} from './_request-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_UPLOAD_DIR = path.join(ROOT_DIR, 'dist', 'uploads');
const PUBLIC_UPLOAD_DIR = path.join(ROOT_DIR, 'public', 'uploads');

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_REQUESTS = 80;
const UPLOAD_WINDOW_MS = 60_000;
const UPLOAD_MAX_REQUESTS = 24;
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
]);

const sanitizeSegment = (value) =>
    String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9/_-]/g, '')
        .replace(/\/+/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');

const extFromMime = (mime) => {
    const value = String(mime || '').toLowerCase();
    if (value === 'image/jpeg' || value === 'image/jpg') return 'jpg';
    if (value === 'image/png') return 'png';
    if (value === 'image/webp') return 'webp';
    if (value === 'image/gif') return 'gif';
    if (value === 'image/avif') return 'avif';
    return 'bin';
};

const parseDataUrl = (value) => {
    const raw = String(value || '');
    const match = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
        mime: match[1].trim().toLowerCase(),
        base64: match[2].trim()
    };
};

const readActorId = (req, body) => {
    const headerActor = typeof req.headers?.['x-actor-id'] === 'string'
        ? req.headers['x-actor-id'].trim()
        : '';
    if (headerActor) return headerActor;
    return typeof body?.actorId === 'string' ? body.actorId.trim() : '';
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: 'Too many requests. Please try again later.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const assertUploader = async (req, body) => {
    const actorId = readActorId(req, body);
    if (!actorId) {
        return { ok: false, statusCode: 401, message: 'actorId is required.' };
    }

    const users = await readUsers();
    const actor = users.find((user) => user.id === actorId);
    if (!actor) {
        return { ok: false, statusCode: 401, message: 'Invalid actor.' };
    }

    return { ok: true };
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    const clientIp = getClientIp(req);
    if (!applyRateLimit(res, `upload-image:all:${clientIp}`, GLOBAL_MAX_REQUESTS, GLOBAL_WINDOW_MS)) {
        return;
    }

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: MAX_BODY_BYTES });
    } catch (error) {
        json(res, Number(error?.statusCode) || 400, { error: error?.message || 'Invalid JSON body.' });
        return;
    }

    if (!applyRateLimit(res, `upload-image:write:${clientIp}`, UPLOAD_MAX_REQUESTS, UPLOAD_WINDOW_MS)) {
        return;
    }

    const auth = await assertUploader(req, body);
    if (!auth.ok) {
        json(res, auth.statusCode, { error: auth.message });
        return;
    }

    const folder = sanitizeSegment(body.folder || 'general');
    const dataUrl = parseDataUrl(body.dataUrl);
    if (!dataUrl) {
        json(res, 400, { error: 'dataUrl must be a valid base64 data URI.' });
        return;
    }
    if (!ALLOWED_MIME_TYPES.has(dataUrl.mime)) {
        json(res, 400, { error: 'Only JPEG/PNG/WEBP/GIF/AVIF images are allowed.' });
        return;
    }

    let bytes;
    try {
        bytes = Buffer.from(dataUrl.base64, 'base64');
    } catch {
        json(res, 400, { error: 'Invalid base64 payload.' });
        return;
    }

    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
        json(res, 400, { error: 'Image size must be between 1 byte and 3 MB.' });
        return;
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = extFromMime(dataUrl.mime);
    const fileName = `${randomUUID()}.${ext}`;
    const relativeDir = [folder, year, month].filter(Boolean).join('/');
    const relativePath = `${relativeDir}/${fileName}`;

    const saveTo = async (baseDir) => {
        const fullDir = path.join(baseDir, relativeDir);
        await fs.mkdir(fullDir, { recursive: true });
        await fs.writeFile(path.join(fullDir, fileName), bytes);
    };

    try {
        await saveTo(DIST_UPLOAD_DIR);
        await saveTo(PUBLIC_UPLOAD_DIR).catch(() => undefined);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save image.';
        json(res, 500, { error: message });
        return;
    }

    json(res, 200, {
        url: `/uploads/${relativePath}`,
        mime: dataUrl.mime,
        size: bytes.length
    });
}
