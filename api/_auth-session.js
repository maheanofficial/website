import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};

const SESSION_TOKEN_PURPOSE = 'session';
const RESET_TOKEN_PURPOSE = 'password-reset';
const SESSION_COOKIE_NAME = 'mahean_auth';
// Keep sessions effectively long-lived unless an explicit TTL is configured.
const FALLBACK_SESSION_TTL_SEC = 10 * 365 * 24 * 60 * 60;
const FALLBACK_RESET_TTL_SEC = 20 * 60;
const SESSION_TTL_SEC = toPositiveInt(pickFirstEnv('AUTH_SESSION_TTL_SEC'), FALLBACK_SESSION_TTL_SEC);
const RESET_TTL_SEC = toPositiveInt(pickFirstEnv('AUTH_RESET_TTL_SEC'), FALLBACK_RESET_TTL_SEC);
const secureCookiesByDefault = String(pickFirstEnv('AUTH_SECURE_COOKIES', 'NODE_ENV'))
    .trim()
    .toLowerCase() === 'production'
    || String(pickFirstEnv('AUTH_SECURE_COOKIES')).trim().toLowerCase() === 'true';

const configuredSecret = pickFirstEnv('AUTH_SESSION_SECRET');
const activeSecret = configuredSecret || randomBytes(48).toString('hex');
if (!configuredSecret) {
    console.warn(
        '[security] AUTH_SESSION_SECRET is not set. Using an ephemeral in-memory secret; '
        + 'all sessions and reset tokens will be invalidated on restart.'
    );
}

const nowSec = () => Math.floor(Date.now() / 1000);

const safeJsonParse = (value) => {
    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Intentionally ignored.
    }
    return null;
};

const b64urlEncode = (value) => Buffer.from(value, 'utf8').toString('base64url');
const b64urlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');

const signToken = (purpose, encodedPayload) =>
    createHmac('sha256', activeSecret)
        .update(`${purpose}.${encodedPayload}`)
        .digest('base64url');

const secureCompare = (left, right) => {
    const leftBuffer = Buffer.from(String(left || ''), 'utf8');
    const rightBuffer = Buffer.from(String(right || ''), 'utf8');
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
};

const encodeToken = (purpose, payload) => {
    const body = b64urlEncode(JSON.stringify(payload));
    const signature = signToken(purpose, body);
    return `${body}.${signature}`;
};

const decodeToken = (purpose, token) => {
    const raw = String(token || '').trim();
    if (!raw || raw.length > 5000) {
        return null;
    }

    const [body, signature, ...rest] = raw.split('.');
    if (!body || !signature || rest.length) {
        return null;
    }

    const expectedSignature = signToken(purpose, body);
    if (!secureCompare(signature, expectedSignature)) {
        return null;
    }

    const payload = safeJsonParse(b64urlDecode(body));
    if (!payload) {
        return null;
    }

    const expiresAt = Number(payload.exp);
    if (!Number.isFinite(expiresAt) || expiresAt <= nowSec()) {
        return null;
    }

    return payload;
};

const parseCookies = (rawCookieHeader) => {
    const out = {};
    const source = String(rawCookieHeader || '');
    if (!source) return out;

    source.split(';').forEach((part) => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex <= 0) return;

        const key = part.slice(0, separatorIndex).trim();
        if (!key) return;

        const value = part.slice(separatorIndex + 1).trim();
        try {
            out[key] = decodeURIComponent(value);
        } catch {
            out[key] = value;
        }
    });

    return out;
};

const firstHeaderValue = (value) =>
    typeof value === 'string'
        ? value.split(',')[0].trim()
        : '';

const readBearerToken = (req) => {
    const authorizationHeader = typeof req.headers?.authorization === 'string'
        ? req.headers.authorization.trim()
        : '';
    const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
};

const readCookieToken = (req) => {
    const cookies = parseCookies(req.headers?.cookie);
    return String(cookies[SESSION_COOKIE_NAME] || '').trim();
};

const shouldUseSecureCookie = (req) => {
    if (secureCookiesByDefault) {
        return true;
    }

    const forwardedProto = firstHeaderValue(req.headers?.['x-forwarded-proto']).toLowerCase();
    if (forwardedProto === 'https') {
        return true;
    }

    return Boolean(req.socket?.encrypted);
};

const appendSetCookie = (res, cookieValue) => {
    const current = res.getHeader('Set-Cookie');
    if (!current) {
        res.setHeader('Set-Cookie', cookieValue);
        return;
    }

    if (Array.isArray(current)) {
        res.setHeader('Set-Cookie', [...current, cookieValue]);
        return;
    }

    res.setHeader('Set-Cookie', [String(current), cookieValue]);
};

const serializeCookie = (name, value, options = {}) => {
    const segments = [`${name}=${encodeURIComponent(String(value || ''))}`];
    segments.push(`Path=${options.path || '/'}`);
    if (Number.isFinite(options.maxAge)) {
        segments.push(`Max-Age=${Math.max(0, Math.floor(Number(options.maxAge)))}`);
    }
    if (options.httpOnly !== false) {
        segments.push('HttpOnly');
    }
    segments.push(`SameSite=${options.sameSite || 'Lax'}`);
    if (options.secure) {
        segments.push('Secure');
    }
    return segments.join('; ');
};

export const sessionCookieName = SESSION_COOKIE_NAME;
export const sessionTtlSec = SESSION_TTL_SEC;
export const resetTokenTtlSec = RESET_TTL_SEC;

export const issueSessionForUser = (res, req, user) => {
    const userId = String(user?.id || '').trim();
    if (!userId) {
        throw new Error('Cannot issue session for empty user id.');
    }

    const issuedAt = nowSec();
    const expiresAt = issuedAt + SESSION_TTL_SEC;
    const token = encodeToken(SESSION_TOKEN_PURPOSE, {
        sub: userId,
        role: user?.role === 'admin' ? 'admin' : 'moderator',
        iat: issuedAt,
        exp: expiresAt,
        nonce: randomBytes(12).toString('hex')
    });

    appendSetCookie(
        res,
        serializeCookie(SESSION_COOKIE_NAME, token, {
            maxAge: SESSION_TTL_SEC,
            sameSite: 'Lax',
            secure: shouldUseSecureCookie(req),
            httpOnly: true,
            path: '/'
        })
    );

    return { token, expiresAt };
};

export const clearSessionCookie = (res, req) => {
    appendSetCookie(
        res,
        serializeCookie(SESSION_COOKIE_NAME, '', {
            maxAge: 0,
            sameSite: 'Lax',
            secure: shouldUseSecureCookie(req),
            httpOnly: true,
            path: '/'
        })
    );
};

export const readSessionClaimsFromRequest = (req) => {
    const token = readBearerToken(req) || readCookieToken(req);
    if (!token) {
        return null;
    }

    const payload = decodeToken(SESSION_TOKEN_PURPOSE, token);
    if (!payload) {
        return null;
    }

    const userId = String(payload.sub || '').trim();
    if (!userId) {
        return null;
    }

    return {
        userId,
        role: payload.role === 'admin' ? 'admin' : 'moderator',
        issuedAt: Number(payload.iat) || 0,
        expiresAt: Number(payload.exp) || 0
    };
};

export const issuePasswordResetToken = (userId) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
        throw new Error('Cannot create password reset token for empty user id.');
    }
    const issuedAt = nowSec();
    return encodeToken(RESET_TOKEN_PURPOSE, {
        sub: normalizedUserId,
        iat: issuedAt,
        exp: issuedAt + RESET_TTL_SEC,
        nonce: randomBytes(12).toString('hex')
    });
};

export const readPasswordResetClaims = (token) => {
    const payload = decodeToken(RESET_TOKEN_PURPOSE, token);
    if (!payload) {
        return null;
    }

    const userId = String(payload.sub || '').trim();
    if (!userId) {
        return null;
    }

    return {
        userId,
        issuedAt: Number(payload.iat) || 0,
        expiresAt: Number(payload.exp) || 0
    };
};
