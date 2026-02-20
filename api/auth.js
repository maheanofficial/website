import {
    createUserRecord,
    findUserByIdentifier,
    isPrimaryAdminEmail,
    readUsers,
    setUserPassword,
    toPublicUser,
    verifyUserPassword,
    writeUsers
} from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    json,
    readJsonBody
} from './_request-utils.js';
import { randomBytes } from 'node:crypto';

const AUTH_BODY_LIMIT_BYTES = 128 * 1024;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_REQUESTS = 180;
const SENSITIVE_WINDOW_MS = 5 * 60_000;
const SENSITIVE_MAX_REQUESTS = 40;
const OAUTH_TIMEOUT_MS = 15_000;
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const GOOGLE_CLIENT_ID = pickFirstEnv('GOOGLE_OAUTH_CLIENT_ID', 'VITE_GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = pickFirstEnv('GOOGLE_OAUTH_CLIENT_SECRET');
const GOOGLE_FIXED_REDIRECT_URI = pickFirstEnv('GOOGLE_OAUTH_REDIRECT_URI');
const GOOGLE_ALLOWED_REDIRECT_ORIGIN = pickFirstEnv('GOOGLE_OAUTH_ALLOWED_REDIRECT_ORIGIN').toLowerCase();

const emailLooksValid = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    const parts = trimmed.split('@');
    return parts.length === 2 && parts[1].includes('.');
};

const normalizeRole = (value) => (value === 'admin' ? 'admin' : 'moderator');
const randomPassword = () => randomBytes(24).toString('hex');

const firstHeaderValue = (value) =>
    typeof value === 'string'
        ? value.split(',')[0].trim()
        : '';

const requestOrigin = (req) => {
    const host = typeof req.headers?.host === 'string' ? req.headers.host.trim() : '';
    if (!host) return '';
    const proto = firstHeaderValue(req.headers?.['x-forwarded-proto']) || 'https';
    return `${proto}://${host}`;
};

const normalizeRedirectUri = (req, candidate) => {
    const requested = String(candidate || '').trim();
    const fallback = GOOGLE_FIXED_REDIRECT_URI || `${requestOrigin(req)}/admin/dashboard`;
    const resolved = requested || fallback;

    let parsed;
    try {
        parsed = new URL(resolved);
    } catch {
        throw new Error('Invalid redirect URI.');
    }

    if (GOOGLE_ALLOWED_REDIRECT_ORIGIN && parsed.origin.toLowerCase() !== GOOGLE_ALLOWED_REDIRECT_ORIGIN) {
        throw new Error('Redirect origin is not allowed.');
    }

    if (GOOGLE_FIXED_REDIRECT_URI && parsed.toString() !== GOOGLE_FIXED_REDIRECT_URI) {
        throw new Error('Redirect URI must match GOOGLE_OAUTH_REDIRECT_URI.');
    }

    return parsed.toString();
};

const fetchJsonWithTimeout = async (url, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        return { response, payload };
    } finally {
        clearTimeout(timeout);
    }
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: 'Too many requests. Please try again later.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const findUserById = (users, userId) =>
    users.find((user) => user.id === userId) || null;

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    const clientIp = getClientIp(req);
    if (!applyRateLimit(res, `auth:all:${clientIp}`, GLOBAL_MAX_REQUESTS, GLOBAL_WINDOW_MS)) {
        return;
    }

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: AUTH_BODY_LIMIT_BYTES });
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 400;
        json(res, statusCode, { error: error?.message || 'Invalid JSON body.' });
        return;
    }

    const action = String(body.action || '').trim().toLowerCase();
    if (!action) {
        json(res, 400, { error: 'action is required.' });
        return;
    }

    const sensitiveAction = new Set([
        'login',
        'signup',
        'update-password',
        'request-password-reset',
        'delete-user',
        'google-oauth-exchange'
    ]).has(action);

    if (
        sensitiveAction
        && !applyRateLimit(res, `auth:sensitive:${clientIp}`, SENSITIVE_MAX_REQUESTS, SENSITIVE_WINDOW_MS)
    ) {
        return;
    }

    if (action === 'login') {
        const identifier = String(body.identifier || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (!identifier || !password) {
            json(res, 400, { error: 'Identifier and password are required.' });
            return;
        }

        const users = await readUsers();
        const user = findUserByIdentifier(users, identifier);
        if (!user || !verifyUserPassword(user, password)) {
            json(res, 401, { error: 'Invalid credentials.' });
            return;
        }

        json(res, 200, { user: toPublicUser(user) });
        return;
    }

    if (action === 'google-oauth-config') {
        let redirectUri;
        try {
            redirectUri = normalizeRedirectUri(req, body.redirectUri);
        } catch (error) {
            json(res, 400, { error: error?.message || 'Invalid redirect URI.' });
            return;
        }

        const enabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
        json(res, 200, {
            enabled,
            clientId: enabled ? GOOGLE_CLIENT_ID : '',
            redirectUri,
            ...(enabled
                ? {}
                : { error: 'Google OAuth is not configured on server. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.' })
        });
        return;
    }

    if (action === 'google-oauth-exchange') {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            json(res, 503, {
                error: 'Google OAuth is not configured on server. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.'
            });
            return;
        }

        const code = String(body.code || '').trim();
        if (!code) {
            json(res, 400, { error: 'code is required.' });
            return;
        }

        let redirectUri;
        try {
            redirectUri = normalizeRedirectUri(req, body.redirectUri);
        } catch (error) {
            json(res, 400, { error: error?.message || 'Invalid redirect URI.' });
            return;
        }

        let tokenPayload;
        try {
            const { response, payload } = await fetchJsonWithTimeout(GOOGLE_TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                }).toString()
            });

            if (!response.ok) {
                const message = typeof payload?.error_description === 'string'
                    ? payload.error_description
                    : (typeof payload?.error === 'string' ? payload.error : 'Google token exchange failed.');
                json(res, 401, { error: message });
                return;
            }

            tokenPayload = payload;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Google token exchange failed.';
            json(res, 502, { error: message });
            return;
        }

        const accessToken = typeof tokenPayload?.access_token === 'string'
            ? tokenPayload.access_token
            : '';
        if (!accessToken) {
            json(res, 502, { error: 'Google did not return an access token.' });
            return;
        }

        let profile;
        try {
            const { response, payload } = await fetchJsonWithTimeout(GOOGLE_USERINFO_ENDPOINT, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            if (!response.ok) {
                json(res, 502, { error: 'Failed to fetch Google user profile.' });
                return;
            }
            profile = payload;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch Google user profile.';
            json(res, 502, { error: message });
            return;
        }

        const email = String(profile?.email || '').trim().toLowerCase();
        const emailVerified = profile?.email_verified !== false;
        if (!email || !emailVerified) {
            json(res, 403, { error: 'Google account email is missing or not verified.' });
            return;
        }

        const displayName = String(profile?.name || profile?.given_name || email.split('@')[0]).trim();
        const photoURL = typeof profile?.picture === 'string' ? profile.picture.trim() : '';
        const users = await readUsers();
        const existing = findUserByIdentifier(users, email);

        if (existing) {
            const existingProviders = Array.isArray(existing.providers)
                ? existing.providers.map((provider) => String(provider || '').trim().toLowerCase()).filter(Boolean)
                : [];
            const nextProviders = Array.from(new Set([...existingProviders, 'google']));
            const nextUser = {
                ...existing,
                providers: nextProviders,
                displayName: existing.displayName || displayName,
                photoURL: photoURL || existing.photoURL
            };

            const index = users.findIndex((entry) => entry.id === existing.id);
            users[index] = nextUser;
            await writeUsers(users);
            json(res, 200, { user: toPublicUser(nextUser) });
            return;
        }

        const newUser = createUserRecord({
            email,
            username: email,
            password: randomPassword(),
            displayName: displayName || email.split('@')[0],
            role: isPrimaryAdminEmail(email) ? 'admin' : 'moderator',
            photoURL: photoURL || undefined,
            providers: ['google']
        });

        users.push(newUser);
        await writeUsers(users);
        json(res, 200, { user: toPublicUser(newUser) });
        return;
    }

    if (action === 'signup') {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const displayName = String(body.displayName || '').trim();

        if (!emailLooksValid(email)) {
            json(res, 400, { error: 'A valid email is required.' });
            return;
        }
        if (password.length < 6) {
            json(res, 400, { error: 'Password must be at least 6 characters.' });
            return;
        }

        const users = await readUsers();
        const exists = findUserByIdentifier(users, email);
        if (exists) {
            json(res, 409, { error: 'User already exists.' });
            return;
        }

        const user = createUserRecord({
            email,
            username: email,
            password,
            displayName: displayName || email.split('@')[0],
            role: 'moderator'
        });

        users.push(user);
        await writeUsers(users);
        json(res, 201, { user: toPublicUser(user) });
        return;
    }

    if (action === 'update-password') {
        const userId = String(body.userId || '').trim();
        const newPassword = String(body.newPassword || '');
        const currentPassword = String(body.currentPassword || '');
        if (!userId || !newPassword) {
            json(res, 400, { error: 'userId and newPassword are required.' });
            return;
        }
        if (newPassword.length < 6) {
            json(res, 400, { error: 'Password must be at least 6 characters.' });
            return;
        }

        const users = await readUsers();
        const index = users.findIndex((entry) => entry.id === userId);
        if (index < 0) {
            json(res, 404, { error: 'User not found.' });
            return;
        }

        const target = users[index];
        if (currentPassword && !verifyUserPassword(target, currentPassword)) {
            json(res, 400, { error: 'Current password is incorrect.' });
            return;
        }

        users[index] = setUserPassword(target, newPassword);
        await writeUsers(users);
        json(res, 200, { success: true });
        return;
    }

    if (action === 'update-profile') {
        const userId = String(body.userId || '').trim();
        const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
        const photoURL = typeof body.photoURL === 'string' ? body.photoURL.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        if (!userId) {
            json(res, 400, { error: 'userId is required.' });
            return;
        }

        const users = await readUsers();
        const index = users.findIndex((user) => user.id === userId);
        if (index < 0) {
            json(res, 404, { error: 'User not found.' });
            return;
        }

        if (email || username) {
            const duplicate = users.find((entry, entryIndex) => {
                if (entryIndex === index) return false;
                const sameEmail = email && (entry.email === email || entry.username === email);
                const sameUsername = username && (entry.username === username || entry.email === username);
                return Boolean(sameEmail || sameUsername);
            });
            if (duplicate) {
                json(res, 409, { error: 'Email or username already in use.' });
                return;
            }
        }

        const nextRole = normalizeRole(users[index].role);
        users[index] = {
            ...users[index],
            role: nextRole,
            displayName: displayName || users[index].displayName,
            photoURL: photoURL || undefined,
            email: email || users[index].email,
            username: username || users[index].username
        };
        await writeUsers(users);
        json(res, 200, { user: toPublicUser(users[index]) });
        return;
    }

    if (action === 'request-password-reset') {
        const identifier = String(body.identifier || '').trim().toLowerCase();
        if (!identifier) {
            json(res, 400, { error: 'Identifier is required.' });
            return;
        }

        const users = await readUsers();
        const user = findUserByIdentifier(users, identifier);
        if (!user) {
            json(res, 404, { error: 'No account found for this identifier.' });
            return;
        }

        // Shared hosting without email provider: return userId token-style response.
        json(res, 200, { success: true, resetUserId: user.id });
        return;
    }

    if (action === 'delete-user') {
        const actorId = String(body.actorId || '').trim();
        const userId = String(body.userId || '').trim();
        if (!actorId || !userId) {
            json(res, 400, { error: 'actorId and userId are required.' });
            return;
        }

        const users = await readUsers();
        const actor = findUserById(users, actorId);
        if (!actor || normalizeRole(actor.role) !== 'admin') {
            json(res, 403, { error: 'Only admin can delete users.' });
            return;
        }

        const target = findUserById(users, userId);
        if (!target) {
            json(res, 404, { error: 'User not found.' });
            return;
        }
        if (actor.id === target.id) {
            json(res, 400, { error: 'You cannot delete your own account.' });
            return;
        }
        if (isPrimaryAdminEmail(target.email || target.username)) {
            json(res, 400, { error: 'Primary admin cannot be deleted.' });
            return;
        }

        await writeUsers(users.filter((user) => user.id !== userId));
        json(res, 200, { success: true });
        return;
    }

    json(res, 400, { error: `Unsupported action: ${action}` });
}
