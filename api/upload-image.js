import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { readUsers } from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    isTrustedOrigin,
    json,
    readJsonBody
} from './_request-utils.js';
import { readSessionClaimsFromRequest } from './_auth-session.js';

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

const detectMimeFromBytes = (bytes) => {
    if (!bytes || bytes.length < 12) return '';

    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg';
    }
    // PNG
    if (
        bytes[0] === 0x89
        && bytes[1] === 0x50
        && bytes[2] === 0x4e
        && bytes[3] === 0x47
        && bytes[4] === 0x0d
        && bytes[5] === 0x0a
        && bytes[6] === 0x1a
        && bytes[7] === 0x0a
    ) {
        return 'image/png';
    }
    // GIF
    if (
        bytes[0] === 0x47
        && bytes[1] === 0x49
        && bytes[2] === 0x46
        && bytes[3] === 0x38
        && (bytes[4] === 0x39 || bytes[4] === 0x37)
        && bytes[5] === 0x61
    ) {
        return 'image/gif';
    }
    // WEBP (RIFF....WEBP)
    if (
        bytes[0] === 0x52
        && bytes[1] === 0x49
        && bytes[2] === 0x46
        && bytes[3] === 0x46
        && bytes[8] === 0x57
        && bytes[9] === 0x45
        && bytes[10] === 0x42
        && bytes[11] === 0x50
    ) {
        return 'image/webp';
    }
    // AVIF (ftyp...avif/avis)
    if (
        bytes[4] === 0x66
        && bytes[5] === 0x74
        && bytes[6] === 0x79
        && bytes[7] === 0x70
    ) {
        const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
        if (brand === 'avif' || brand === 'avis') {
            return 'image/avif';
        }
    }

    return '';
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: 'Too many requests. Please try again later.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const assertUploader = async (req) => {
    const claims = readSessionClaimsFromRequest(req);
    if (!claims?.userId) {
        return { ok: false, statusCode: 401, message: 'Authentication is required.' };
    }

    const users = await readUsers();
    const actor = users.find((user) => user.id === claims.userId);
    if (!actor) {
        return { ok: false, statusCode: 401, message: 'Invalid session actor.' };
    }

    return { ok: true, actor };
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    if (!isTrustedOrigin(req)) {
        json(res, 403, { error: 'Cross-site request blocked.' });
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

    const auth = await assertUploader(req);
    if (!auth.ok) {
        json(res, auth.statusCode, { error: auth.message });
        return;
    }

    if (!applyRateLimit(res, `upload-image:user:${auth.actor.id}`, UPLOAD_MAX_REQUESTS, UPLOAD_WINDOW_MS)) {
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

    const detectedMime = detectMimeFromBytes(bytes);
    const normalizedRequestedMime = dataUrl.mime === 'image/jpg' ? 'image/jpeg' : dataUrl.mime;
    if (!detectedMime || detectedMime !== normalizedRequestedMime) {
        json(res, 400, { error: 'Image MIME type mismatch detected.' });
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
