#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { gzipSync } = require('node:zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_CF_ACCOUNT_ID = '56cf6fdbc6fa2d30b97eea52e6da1c28';
const DEFAULT_D1_DATABASE_ID = 'c52018ec-f481-4147-a442-51d0fb35167b';
const D1_API_BASE = 'https://api.cloudflare.com/client/v4';
const STORE_TABLE_NAME = 'app_table_rows';
const COMPRESSED_ROW_FORMAT = 'gzip-base64-json-v1';
const D1_ROW_JSON_SOFT_LIMIT_BYTES = 900_000;

const pickEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const normalizeInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseJsonRecord = (value, fallback = {}) => {
    try {
        const parsed = JSON.parse(String(value || '{}'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Ignore parse errors.
    }
    return fallback;
};

const loadDeployLocalJson = async () => {
    const filePath = path.join(ROOT_DIR, '.deploy.local.json');
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const toUserRowJson = (row) => {
    const parsed = parseJsonRecord(row?.user_json, null);
    if (parsed) {
        return parsed;
    }

    const providers = (() => {
        try {
            const raw = JSON.parse(String(row?.providers_json || '[]'));
            return Array.isArray(raw) ? raw : [];
        } catch {
            return [];
        }
    })();

    return {
        id: String(row?.id || ''),
        username: String(row?.username || ''),
        email: row?.email ? String(row.email) : null,
        password: String(row?.password || ''),
        role: String(row?.role || 'reader'),
        createdAt: String(row?.created_at || new Date().toISOString()),
        displayName: String(row?.display_name || ''),
        photoURL: row?.photo_url ? String(row.photo_url) : null,
        providers
    };
};

const prepareRowJsonForD1 = (rawRowJson) => {
    const normalized = String(rawRowJson || '{}');
    if (Buffer.byteLength(normalized, 'utf8') <= D1_ROW_JSON_SOFT_LIMIT_BYTES) {
        return normalized;
    }

    const compressedBase64 = gzipSync(Buffer.from(normalized, 'utf8')).toString('base64');
    const wrapped = JSON.stringify({
        __format: COMPRESSED_ROW_FORMAT,
        data: compressedBase64
    });

    if (Buffer.byteLength(wrapped, 'utf8') > D1_ROW_JSON_SOFT_LIMIT_BYTES) {
        throw new Error('Row payload too large for D1 even after compression.');
    }

    return wrapped;
};

const createD1Client = ({ token, accountId, databaseId }) => {
    if (!token) {
        throw new Error('Missing CLOUDFLARE_API_TOKEN.');
    }

    const endpoint = `${D1_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`;

    const query = async (sql, params = []) => {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sql: String(sql || ''),
                params: Array.isArray(params) ? params : []
            })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`D1 HTTP ${response.status}: ${text.slice(0, 500)}`);
        }

        const payload = await response.json();
        if (!payload?.success) {
            const err = Array.isArray(payload?.errors) && payload.errors.length
                ? JSON.stringify(payload.errors[0])
                : 'Unknown D1 API error';
            throw new Error(err);
        }

        const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;
        if (result && result.success === false) {
            throw new Error(JSON.stringify(result));
        }

        return result || {};
    };

    return { query };
};

const main = async () => {
    const deployConfig = await loadDeployLocalJson();

    const token = pickEnv('CLOUDFLARE_API_TOKEN');
    const accountId = pickEnv('CLOUDFLARE_ACCOUNT_ID') || DEFAULT_CF_ACCOUNT_ID;
    const databaseId = pickEnv('CLOUDFLARE_D1_DATABASE_ID') || DEFAULT_D1_DATABASE_ID;

    const mysqlHost = pickEnv('MYSQL_HOST', 'DB_HOST') || String(deployConfig.host || '');
    const mysqlPort = normalizeInt(pickEnv('MYSQL_PORT', 'DB_PORT'), 3306);
    const mysqlUser = pickEnv('MYSQL_USER', 'DB_USER') || String(deployConfig.user || '');
    const mysqlPassword = pickEnv('MYSQL_PASSWORD', 'DB_PASSWORD') || String(deployConfig.password || '');
    const mysqlDatabase = pickEnv('MYSQL_DATABASE', 'DB_NAME') || 'mahean_site';
    const mysqlTablePrefix = pickEnv('MYSQL_TABLE_PREFIX', 'DB_TABLE_PREFIX') || 'app_table';
    const mysqlUsersTable = pickEnv('MYSQL_USERS_TABLE', 'DB_USERS_TABLE') || 'app_users';

    const d1 = createD1Client({ token, accountId, databaseId });
    const mysqlConn = await mysql.createConnection({
        host: mysqlHost,
        port: mysqlPort,
        user: mysqlUser,
        password: mysqlPassword,
        database: mysqlDatabase,
        charset: 'utf8mb4'
    });

    try {
        await d1.query(`
            CREATE TABLE IF NOT EXISTS "${STORE_TABLE_NAME}" (
                "pk" INTEGER PRIMARY KEY AUTOINCREMENT,
                "table_name" TEXT NOT NULL,
                "row_json" TEXT NOT NULL,
                "created_at" TEXT NOT NULL,
                "updated_at" TEXT NOT NULL
            )
        `);
        await d1.query(`
            CREATE INDEX IF NOT EXISTS "idx_app_table_rows_table_name"
            ON "${STORE_TABLE_NAME}"("table_name")
        `);
        await d1.query(`DELETE FROM "${STORE_TABLE_NAME}"`);

        const [tableRows] = await mysqlConn.query('SHOW TABLES');
        const allTableNames = (Array.isArray(tableRows) ? tableRows : [])
            .map((entry) => String(Object.values(entry || {})[0] || ''))
            .filter(Boolean);
        const dataTablePrefix = `${mysqlTablePrefix}_`;
        const logicalTables = allTableNames
            .filter((tableName) => tableName.startsWith(dataTablePrefix))
            .map((tableName) => ({
                physicalName: tableName,
                logicalName: tableName.slice(dataTablePrefix.length)
            }));

        const now = new Date().toISOString();
        let totalInserted = 0;

        for (const table of logicalTables) {
            const [rows] = await mysqlConn.query(
                `SELECT row_json FROM \`${table.physicalName}\` ORDER BY pk ASC`
            );
            let inserted = 0;
            for (const row of Array.isArray(rows) ? rows : []) {
                const rowJson = prepareRowJsonForD1(row?.row_json);
                await d1.query(
                    `INSERT INTO "${STORE_TABLE_NAME}" ("table_name","row_json","created_at","updated_at")
                     VALUES (?, ?, ?, ?)`,
                    [table.logicalName, rowJson, now, now]
                );
                inserted += 1;
                totalInserted += 1;
            }
            console.log(`[migrate] ${table.physicalName} -> ${table.logicalName}: ${inserted}`);
        }

        if (allTableNames.includes(mysqlUsersTable)) {
            const [rows] = await mysqlConn.query(
                `SELECT id, username, email, password, role, created_at, display_name, photo_url, providers_json, user_json
                 FROM \`${mysqlUsersTable}\`
                 ORDER BY updated_at ASC, id ASC`
            );
            let inserted = 0;
            for (const row of Array.isArray(rows) ? rows : []) {
                const rowJson = prepareRowJsonForD1(JSON.stringify(toUserRowJson(row)));
                await d1.query(
                    `INSERT INTO "${STORE_TABLE_NAME}" ("table_name","row_json","created_at","updated_at")
                     VALUES (?, ?, ?, ?)`,
                    ['users', rowJson, now, now]
                );
                inserted += 1;
                totalInserted += 1;
            }
            console.log(`[migrate] ${mysqlUsersTable} -> users: ${inserted}`);
        } else {
            console.log(`[migrate] skipped users table; missing "${mysqlUsersTable}"`);
        }

        const summary = await d1.query(
            `SELECT table_name, COUNT(*) AS c
             FROM "${STORE_TABLE_NAME}"
             GROUP BY table_name
             ORDER BY table_name ASC`
        );
        const rows = Array.isArray(summary?.results) ? summary.results : [];
        console.log('[migrate] D1 summary:', rows);
        console.log(`[migrate] total rows inserted: ${totalInserted}`);
    } finally {
        await mysqlConn.end().catch(() => undefined);
    }
};

main().catch((error) => {
    console.error('[migrate] failed:', error?.message || error);
    process.exitCode = 1;
});
