const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const RATE_BUCKETS = new Map();
const MAX_BUCKETS_BEFORE_CLEANUP = 4000;

const normalizeIp = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const first = raw.split(',')[0].trim();
    if (!first) return '';

    const ipv6Match = first.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv6Match) return ipv6Match[1];

    if (first.includes(':') && !first.includes('.')) {
        return first;
    }

    return first.replace(/:\d+$/, '');
};

export const getClientIp = (req) => {
    const fromCf = normalizeIp(req.headers?.['cf-connecting-ip']);
    if (fromCf) return fromCf;

    const fromForwarded = normalizeIp(req.headers?.['x-forwarded-for']);
    if (fromForwarded) return fromForwarded;

    const fromRealIp = normalizeIp(req.headers?.['x-real-ip']);
    if (fromRealIp) return fromRealIp;

    const fromSocket = normalizeIp(req.socket?.remoteAddress);
    return fromSocket || 'unknown';
};

export const json = (res, statusCode, payload, headers = {}) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            res.setHeader(key, value);
        }
    });
    res.end(JSON.stringify(payload));
};

const toBodyError = (statusCode, code, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
};

export const readJsonBody = async (req, options = {}) => {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    const maxBytes = Number.isFinite(options.maxBytes)
        ? Math.max(1, Number(options.maxBytes))
        : DEFAULT_MAX_BODY_BYTES;

    let totalBytes = 0;
    const chunks = [];

    for await (const chunk of req) {
        const chunkBuffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(String(chunk), 'utf8');
        totalBytes += chunkBuffer.length;
        if (totalBytes > maxBytes) {
            throw toBodyError(413, 'BODY_TOO_LARGE', `Request body exceeds ${maxBytes} bytes.`);
        }
        chunks.push(chunkBuffer);
    }

    if (!chunks.length) {
        return {};
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    try {
        return JSON.parse(raw);
    } catch {
        throw toBodyError(400, 'INVALID_JSON', 'Invalid JSON body.');
    }
};

const cleanupRateBuckets = (now) => {
    if (RATE_BUCKETS.size < MAX_BUCKETS_BEFORE_CLEANUP) {
        return;
    }
    for (const [key, bucket] of RATE_BUCKETS.entries()) {
        if (!bucket || bucket.resetAt <= now) {
            RATE_BUCKETS.delete(key);
        }
    }
};

export const consumeRateLimit = (key, max, windowMs) => {
    const safeKey = String(key || '').trim();
    if (!safeKey) {
        return { allowed: true, remaining: Number(max) || 0, retryAfterSec: 0 };
    }

    const safeMax = Math.max(1, Number(max) || 1);
    const safeWindowMs = Math.max(1000, Number(windowMs) || 60_000);
    const now = Date.now();
    cleanupRateBuckets(now);

    let bucket = RATE_BUCKETS.get(safeKey);
    if (!bucket || bucket.resetAt <= now) {
        bucket = {
            count: 0,
            resetAt: now + safeWindowMs
        };
        RATE_BUCKETS.set(safeKey, bucket);
    }

    if (bucket.count >= safeMax) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
        };
    }

    bucket.count += 1;
    return {
        allowed: true,
        remaining: Math.max(0, safeMax - bucket.count),
        retryAfterSec: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000))
    };
};
