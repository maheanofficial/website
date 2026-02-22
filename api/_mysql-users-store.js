import { randomUUID } from 'node:crypto';
import { mysqlUsersTable } from './_db-config.js';
import { mysqlQuery, withMysqlTransaction } from './_mysql-client.js';

const tableReadyState = {
    promise: null
};

const escapeIdentifier = (identifier) => {
    if (!/^[a-z0-9_]+$/i.test(identifier)) {
        throw new Error('Invalid SQL identifier.');
    }
    return `\`${identifier}\``;
};

const usersTableIdentifier = escapeIdentifier(mysqlUsersTable);

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
    const providers = normalizeProviders(user.providers);
    return {
        id: String(user.id || randomUUID()),
        username,
        email: email || null,
        password: String(user.password || ''),
        role: user.role === 'admin' ? 'admin' : 'moderator',
        createdAt: String(user.createdAt || new Date().toISOString()),
        displayName: String(user.displayName || username.split('@')[0] || 'user'),
        photoURL: typeof user.photoURL === 'string' ? user.photoURL : null,
        providers
    };
};

const parseProvidersJson = (value) => {
    if (Array.isArray(value)) {
        return normalizeProviders(value);
    }
    try {
        const parsed = JSON.parse(String(value || '[]'));
        return normalizeProviders(parsed);
    } catch {
        return ['local'];
    }
};

const parseUserJson = (value) => {
    try {
        const parsed = JSON.parse(String(value || '{}'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Fallback to scalar columns below.
    }
    return null;
};

const toUserFromRow = (row) => {
    const parsed = parseUserJson(row?.user_json);
    if (parsed) {
        return toUserPayload(parsed);
    }
    return toUserPayload({
        id: row?.id,
        username: row?.username,
        email: row?.email,
        password: row?.password,
        role: row?.role,
        createdAt: row?.created_at,
        displayName: row?.display_name,
        photoURL: row?.photo_url,
        providers: parseProvidersJson(row?.providers_json)
    });
};

export const ensureMysqlUsersTable = async () => {
    if (tableReadyState.promise) {
        return tableReadyState.promise;
    }

    tableReadyState.promise = mysqlQuery(`
        CREATE TABLE IF NOT EXISTS ${usersTableIdentifier} (
            id VARCHAR(191) NOT NULL,
            username VARCHAR(191) NOT NULL,
            email VARCHAR(191) NULL,
            password TEXT NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'moderator',
            created_at VARCHAR(64) NULL,
            display_name VARCHAR(191) NULL,
            photo_url TEXT NULL,
            providers_json LONGTEXT NOT NULL,
            user_json LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_username (username),
            KEY idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    try {
        await tableReadyState.promise;
    } catch (error) {
        tableReadyState.promise = null;
        throw error;
    }
};

export const readUsersFromMysql = async () => {
    await ensureMysqlUsersTable();
    const rows = await mysqlQuery(
        `SELECT id, username, email, password, role, created_at, display_name, photo_url, providers_json, user_json
         FROM ${usersTableIdentifier}
         ORDER BY updated_at ASC, id ASC`
    );
    return (Array.isArray(rows) ? rows : []).map(toUserFromRow);
};

export const writeUsersToMysql = async (users) => {
    await ensureMysqlUsersTable();
    const source = Array.isArray(users) ? users : [];
    const normalized = source.map(toUserPayload);

    await withMysqlTransaction(async (connection) => {
        for (const user of normalized) {
            await connection.query(
                `INSERT INTO ${usersTableIdentifier}
                    (id, username, email, password, role, created_at, display_name, photo_url, providers_json, user_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    username = VALUES(username),
                    email = VALUES(email),
                    password = VALUES(password),
                    role = VALUES(role),
                    created_at = VALUES(created_at),
                    display_name = VALUES(display_name),
                    photo_url = VALUES(photo_url),
                    providers_json = VALUES(providers_json),
                    user_json = VALUES(user_json)`,
                [
                    user.id,
                    user.username,
                    user.email,
                    user.password,
                    user.role,
                    user.createdAt,
                    user.displayName,
                    user.photoURL,
                    JSON.stringify(user.providers),
                    JSON.stringify(user)
                ]
            );
        }

        if (normalized.length > 0) {
            const keepPlaceholders = normalized.map(() => '?').join(', ');
            const keepIds = normalized.map((user) => user.id);
            await connection.query(
                `DELETE FROM ${usersTableIdentifier} WHERE id NOT IN (${keepPlaceholders})`,
                keepIds
            );
        } else {
            await connection.query(`DELETE FROM ${usersTableIdentifier}`);
        }
    });
};

export const mysqlUsersTableName = mysqlUsersTable;

