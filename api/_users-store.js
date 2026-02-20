import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const PRIMARY_ADMIN_EMAIL = (
    pickFirstEnv('PRIMARY_ADMIN_EMAIL', 'VITE_PRIMARY_ADMIN_EMAIL')
    || 'mahean4bd@gmail.com'
).toLowerCase();

const PRIMARY_ADMIN_PASSWORD =
    pickFirstEnv('PRIMARY_ADMIN_PASSWORD')
    || 'mahean123';

const normalizeRole = (value) => (value === 'admin' ? 'admin' : 'moderator');
const normalizeProvider = (value) => {
    const provider = normalizeIdentifier(value);
    if (provider === 'google') return 'google';
    if (provider === 'email' || provider === 'local') return 'local';
    return '';
};
const normalizeProviders = (value) => {
    const source = Array.isArray(value) ? value : [];
    const providers = source
        .map((entry) => normalizeProvider(entry))
        .filter(Boolean);
    if (!providers.length) {
        return ['local'];
    }
    return Array.from(new Set(providers));
};
const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();
const HASH_PREFIX = 'scrypt$';
const HASH_KEY_LENGTH = 64;

const toRecord = (value) =>
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const isPasswordHash = (value) =>
    typeof value === 'string' && value.startsWith(HASH_PREFIX);

export const hashPassword = (value) => {
    const normalized = String(value || '');
    if (!normalized) return '';
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(normalized, salt, HASH_KEY_LENGTH).toString('hex');
    return `${HASH_PREFIX}${salt}$${hash}`;
};

const ensurePasswordHash = (storedPassword, fallbackPassword = '') => {
    const current = String(storedPassword || '');
    if (current && isPasswordHash(current)) {
        return current;
    }
    const source = current || String(fallbackPassword || '');
    if (!source) return '';
    return hashPassword(source);
};

export const verifyPassword = (plainPassword, storedPassword) => {
    const normalizedStored = String(storedPassword || '');
    const normalizedInput = String(plainPassword || '');
    if (!normalizedStored) return false;

    if (!isPasswordHash(normalizedStored)) {
        return normalizedInput === normalizedStored;
    }

    const parts = normalizedStored.split('$');
    if (parts.length !== 3) {
        return false;
    }

    const salt = parts[1];
    const expectedHex = parts[2];
    if (!salt || !expectedHex) {
        return false;
    }

    try {
        const actual = scryptSync(normalizedInput, salt, HASH_KEY_LENGTH);
        const expected = Buffer.from(expectedHex, 'hex');
        if (expected.length !== actual.length) {
            return false;
        }
        return timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
};

const sanitizeUser = (user) => {
    const normalizedEmail = normalizeIdentifier(user.email || user.username || '');
    const username = normalizeIdentifier(user.username || normalizedEmail);
    return {
        id: String(user.id || randomUUID()),
        username,
        email: normalizedEmail || undefined,
        password: String(user.password || ''),
        role: normalizeRole(user.role),
        createdAt: user.createdAt || new Date().toISOString(),
        displayName: String(user.displayName || username.split('@')[0] || 'user'),
        photoURL: typeof user.photoURL === 'string' ? user.photoURL : undefined,
        providers: normalizeProviders(user.providers)
    };
};

const ensurePrimaryAdmin = (users) => {
    const normalized = Array.isArray(users) ? users.map(sanitizeUser) : [];
    const adminIndex = normalized.findIndex((user) => normalizeIdentifier(user.email) === PRIMARY_ADMIN_EMAIL);
    const primaryAdmin = sanitizeUser({
        id: adminIndex >= 0 ? normalized[adminIndex].id : 'primary-admin',
        username: PRIMARY_ADMIN_EMAIL,
        email: PRIMARY_ADMIN_EMAIL,
        password: adminIndex >= 0
            ? (normalized[adminIndex].password || PRIMARY_ADMIN_PASSWORD)
            : PRIMARY_ADMIN_PASSWORD,
        role: 'admin',
        createdAt: adminIndex >= 0 ? normalized[adminIndex].createdAt : new Date().toISOString(),
        displayName: adminIndex >= 0
            ? (normalized[adminIndex].displayName || PRIMARY_ADMIN_EMAIL.split('@')[0])
            : PRIMARY_ADMIN_EMAIL.split('@')[0],
        photoURL: adminIndex >= 0 ? normalized[adminIndex].photoURL : undefined
    });

    if (adminIndex >= 0) {
        normalized[adminIndex] = primaryAdmin;
        return normalized;
    }
    return [primaryAdmin, ...normalized];
};

const prepareUsersForStore = (users) =>
    ensurePrimaryAdmin(users).map((user) => {
        const fallbackPassword = isPrimaryAdminEmail(user.email || user.username)
            ? PRIMARY_ADMIN_PASSWORD
            : '';
        return {
            ...user,
            password: ensurePasswordHash(user.password, fallbackPassword)
        };
    });

const ensureStore = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(USERS_FILE);
    } catch {
        const users = prepareUsersForStore([]);
        await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), 'utf8');
    }
};

export const readUsers = async () => {
    await ensureStore();
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    let parsed = {};
    try {
        parsed = toRecord(JSON.parse(raw));
    } catch {
        parsed = {};
    }

    const users = prepareUsersForStore(Array.isArray(parsed.users) ? parsed.users : []);
    const nextRaw = JSON.stringify({ users }, null, 2);
    if (nextRaw.trim() !== raw.trim()) {
        await fs.writeFile(USERS_FILE, nextRaw, 'utf8');
    }
    return users;
};

export const writeUsers = async (users) => {
    const normalized = prepareUsersForStore(users);
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: normalized }, null, 2), 'utf8');
};

export const toPublicUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email || user.username,
    displayName: user.displayName,
    role: normalizeRole(user.role),
    createdAt: user.createdAt,
    photoURL: user.photoURL,
    providers: normalizeProviders(user.providers)
});

export const findUserByIdentifier = (users, identifier) => {
    const target = normalizeIdentifier(identifier);
    if (!target) return null;
    return users.find((user) => {
        const username = normalizeIdentifier(user.username);
        const email = normalizeIdentifier(user.email);
        return username === target || email === target;
    }) || null;
};

export const isPrimaryAdminEmail = (email) =>
    normalizeIdentifier(email) === PRIMARY_ADMIN_EMAIL;

export const createUserRecord = (payload) =>
    sanitizeUser({
        id: randomUUID(),
        username: payload.username || payload.email,
        email: payload.email || payload.username,
        password: ensurePasswordHash(payload.password),
        role: payload.role,
        createdAt: new Date().toISOString(),
        displayName: payload.displayName,
        photoURL: payload.photoURL,
        providers: payload.providers
    });

export const verifyUserPassword = (user, plainPassword) =>
    verifyPassword(plainPassword, user?.password);

export const setUserPassword = (user, plainPassword) => ({
    ...user,
    password: ensurePasswordHash('', plainPassword)
});

export const primaryAdminEmail = PRIMARY_ADMIN_EMAIL;
