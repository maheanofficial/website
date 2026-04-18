import { randomUUID } from 'node:crypto';
import { deleteRows, insertRows, listRows } from './_d1-table-store.js';

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

const normalizeProviders = (value) => {
    const source = Array.isArray(value) ? value : [];
    const providers = source
        .map((entry) => normalizeIdentifier(entry))
        .filter(Boolean);
    if (!providers.length) {
        return ['local'];
    }
    return Array.from(new Set(providers));
};

const toUserPayload = (value) => {
    const user = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const email = normalizeIdentifier(user.email || user.username || '');
    const username = normalizeIdentifier(user.username || email);
    return {
        id: String(user.id || randomUUID()),
        username,
        email: email || null,
        password: String(user.password || ''),
        role: user.role === 'admin'
            ? 'admin'
            : (user.role === 'moderator' ? 'moderator' : 'reader'),
        createdAt: String(user.createdAt || new Date().toISOString()),
        displayName: String(user.displayName || username.split('@')[0] || 'user'),
        photoURL: typeof user.photoURL === 'string' ? user.photoURL : null,
        providers: normalizeProviders(user.providers)
    };
};

export const readUsersFromD1 = async () => {
    const rows = await listRows('users', {
        orderBy: { column: 'createdAt', ascending: true }
    });
    return (Array.isArray(rows) ? rows : []).map((row) => toUserPayload(row));
};

export const writeUsersToD1 = async (users) => {
    const source = Array.isArray(users) ? users : [];
    const normalized = source.map((entry) => toUserPayload(entry));
    await deleteRows('users', []);
    if (normalized.length) {
        await insertRows('users', normalized);
    }
};
