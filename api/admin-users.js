import {
    createUserRecord,
    findUserByIdentifier,
    isPrimaryAdminEmail,
    readUsers,
    toPublicUser,
    writeUsers
} from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    json,
    readJsonBody
} from './_request-utils.js';

const ADMIN_USERS_BODY_LIMIT_BYTES = 64 * 1024;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_REQUESTS = 120;
const WRITE_WINDOW_MS = 5 * 60_000;
const WRITE_MAX_REQUESTS = 50;

const emailLooksValid = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    const parts = trimmed.split('@');
    return parts.length === 2 && parts[1].includes('.');
};

const normalizeRole = (value) => (value === 'admin' ? 'admin' : 'moderator');

const readActorId = (req, body) => {
    const headerActor = typeof req.headers?.['x-actor-id'] === 'string'
        ? req.headers['x-actor-id'].trim()
        : '';
    if (headerActor) return headerActor;
    const bodyActor = typeof body?.actorId === 'string' ? body.actorId.trim() : '';
    return bodyActor;
};

const assertAdminActor = async (req, body) => {
    const actorId = readActorId(req, body);
    if (!actorId) {
        return { ok: false, statusCode: 401, message: 'actorId is required.' };
    }

    const users = await readUsers();
    const actor = users.find((user) => user.id === actorId);
    if (!actor) {
        return { ok: false, statusCode: 401, message: 'Invalid actor.' };
    }
    if (normalizeRole(actor.role) !== 'admin') {
        return { ok: false, statusCode: 403, message: 'Only admin can manage users.' };
    }

    return { ok: true, users, actor };
};

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: 'Too many requests. Please try again later.' }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (!['GET', 'POST', 'DELETE'].includes(method)) {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    const clientIp = getClientIp(req);
    if (!applyRateLimit(res, `admin-users:all:${clientIp}`, GLOBAL_MAX_REQUESTS, GLOBAL_WINDOW_MS)) {
        return;
    }

    let parsedBody = {};
    if (method !== 'GET') {
        try {
            parsedBody = await readJsonBody(req, { maxBytes: ADMIN_USERS_BODY_LIMIT_BYTES });
        } catch (error) {
            json(res, Number(error?.statusCode) || 400, { error: error?.message || 'Invalid JSON body.' });
            return;
        }
    }

    if (
        method !== 'GET'
        && !applyRateLimit(res, `admin-users:write:${clientIp}`, WRITE_MAX_REQUESTS, WRITE_WINDOW_MS)
    ) {
        return;
    }

    const auth = await assertAdminActor(req, parsedBody);
    if (!auth.ok) {
        json(res, auth.statusCode, { error: auth.message });
        return;
    }

    const users = auth.users;

    if (method === 'GET') {
        json(res, 200, {
            users: users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email))
        });
        return;
    }

    if (method === 'POST') {
        const email = String(parsedBody.email || '').trim().toLowerCase();
        const password = String(parsedBody.password || '');
        const displayName = String(parsedBody.displayName || '').trim();
        const role = normalizeRole(parsedBody.role);

        if (!emailLooksValid(email)) {
            json(res, 400, { error: 'A valid email is required.' });
            return;
        }
        if (password.length < 6) {
            json(res, 400, { error: 'Password must be at least 6 characters.' });
            return;
        }
        const existing = findUserByIdentifier(users, email);
        if (existing) {
            json(res, 409, { error: 'User already exists.' });
            return;
        }

        const user = createUserRecord({
            email,
            username: email,
            password,
            displayName: displayName || email.split('@')[0],
            role: isPrimaryAdminEmail(email) ? 'admin' : role
        });

        users.push(user);
        await writeUsers(users);
        json(res, 201, { user: toPublicUser(user) });
        return;
    }

    const userId = String(parsedBody.userId || '').trim();
    if (!userId) {
        json(res, 400, { error: 'userId is required.' });
        return;
    }

    const target = users.find((user) => user.id === userId);
    if (!target) {
        json(res, 404, { error: 'User not found.' });
        return;
    }
    if (target.id === auth.actor.id) {
        json(res, 400, { error: 'You cannot delete your own account.' });
        return;
    }
    if (isPrimaryAdminEmail(target.email || target.username)) {
        json(res, 400, { error: 'Primary admin account cannot be deleted.' });
        return;
    }

    await writeUsers(users.filter((user) => user.id !== userId));
    json(res, 200, { success: true });
}
