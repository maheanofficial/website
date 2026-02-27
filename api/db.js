import {
    deleteRows,
    insertRows,
    listRows,
    updateRows,
    upsertRows
} from './_table-store.js';
import { readUsers } from './_users-store.js';
import {
    consumeRateLimit,
    getClientIp,
    isTrustedOrigin,
    json,
    readJsonBody
} from './_request-utils.js';
import { readSessionClaimsFromRequest } from './_auth-session.js';

const DB_BODY_LIMIT_BYTES = 12 * 1024 * 1024;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_REQUESTS = 400;
const WRITE_WINDOW_MS = 60_000;
const WRITE_MAX_REQUESTS = 160;

const WRITE_ACTIONS = new Set(['insert', 'upsert', 'update', 'delete']);
const ALLOWED_ACTIONS = new Set(['select', ...WRITE_ACTIONS]);
const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const TABLE_ACCESS = new Map([
    ['stories', {
        publicRead: true,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: true
    }],
    ['authors', {
        publicRead: true,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: true
    }],
    ['categories', {
        publicRead: true,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: true
    }],
    ['activity_logs', {
        publicRead: false,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: false
    }],
    ['login_history', {
        publicRead: false,
        publicWrite: new Set(['insert']),
        moderatorWrite: true,
        moderatorDelete: false
    }],
    ['analytics_daily', {
        publicRead: false,
        publicWrite: new Set(['insert', 'upsert']),
        moderatorWrite: true,
        moderatorDelete: false
    }],
    ['trash', {
        publicRead: false,
        publicWrite: new Set(),
        moderatorWrite: true,
        moderatorDelete: true
    }]
]);

const toString = (value) => String(value || '').trim();

const sanitizeJsonValue = (value, depth = 0) => {
    if (depth > 40) {
        return null;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeJsonValue(entry, depth + 1));
    }

    if (value && typeof value === 'object') {
        const out = {};
        Object.entries(value).forEach(([key, nested]) => {
            if (!key || BLOCKED_OBJECT_KEYS.has(key)) {
                return;
            }
            out[key] = sanitizeJsonValue(nested, depth + 1);
        });
        return out;
    }

    return value;
};

const normalizeFilters = (value) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => ({
            op: toString(entry?.op).toLowerCase(),
            column: toString(entry?.column),
            value: sanitizeJsonValue(entry?.value)
        }))
        .filter((entry) => entry.op && entry.column);
};

const normalizeOrderBy = (value) => {
    if (!value || typeof value !== 'object') return null;
    const column = toString(value.column);
    if (!column) return null;
    return {
        column,
        ascending: Boolean(value.ascending)
    };
};

const maybeArray = (value) => (Array.isArray(value) ? value : [value]);

const toColumnList = (columns) =>
    String(columns || '*')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

const selectColumns = (rows, columns) => {
    if (columns === '*') {
        return rows;
    }
    const selectedColumns = toColumnList(columns);
    return rows.map((row) => {
        const out = {};
        selectedColumns.forEach((column) => {
            out[column] = row?.[column];
        });
        return out;
    });
};

const sanitizeRowsInput = (value) =>
    maybeArray(value)
        .map((entry) => sanitizeJsonValue(entry))
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));

const applyRateLimit = (res, key, max, windowMs) => {
    const result = consumeRateLimit(key, max, windowMs);
    if (result.allowed) return true;

    json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } }, {
        'Retry-After': String(result.retryAfterSec)
    });
    return false;
};

const resolveActorFromSession = async (req) => {
    const claims = readSessionClaimsFromRequest(req);
    if (!claims?.userId) {
        return null;
    }

    const users = await readUsers();
    const actor = users.find((user) => user.id === claims.userId);
    if (!actor) {
        return null;
    }

    return {
        id: actor.id,
        role: actor.role === 'admin' ? 'admin' : 'moderator'
    };
};

const assertAccess = async (req, action, table) => {
    const policy = TABLE_ACCESS.get(table);
    if (!policy) {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN_TABLE',
            message: 'Table is not allowed.'
        };
    }

    const isWrite = WRITE_ACTIONS.has(action);
    if (isWrite && !isTrustedOrigin(req)) {
        return {
            ok: false,
            statusCode: 403,
            code: 'CSRF_BLOCKED',
            message: 'Cross-site request blocked.'
        };
    }

    if (action === 'select') {
        if (policy.publicRead) {
            return { ok: true, actor: null };
        }

        const actor = await resolveActorFromSession(req);
        if (!actor) {
            return {
                ok: false,
                statusCode: 401,
                code: 'AUTH_REQUIRED',
                message: 'Authentication is required for this table.'
            };
        }

        return { ok: true, actor };
    }

    if (policy.publicWrite.has(action)) {
        return { ok: true, actor: null };
    }

    const actor = await resolveActorFromSession(req);
    if (!actor) {
        return {
            ok: false,
            statusCode: 401,
            code: 'AUTH_REQUIRED',
            message: 'Authentication is required for write operations.'
        };
    }

    if (actor.role === 'admin') {
        return { ok: true, actor };
    }

    if (!policy.moderatorWrite) {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Only admin can modify this table.'
        };
    }

    if (action === 'delete' && !policy.moderatorDelete) {
        return {
            ok: false,
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Only admin can delete records from this table.'
        };
    }

    return { ok: true, actor };
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
        json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
        return;
    }

    const clientIp = getClientIp(req);
    if (!applyRateLimit(res, `db:all:${clientIp}`, GLOBAL_MAX_REQUESTS, GLOBAL_WINDOW_MS)) {
        return;
    }

    let body;
    try {
        body = await readJsonBody(req, { maxBytes: DB_BODY_LIMIT_BYTES });
    } catch (error) {
        json(res, Number(error?.statusCode) || 400, {
            error: {
                code: error?.code || 'INVALID_JSON',
                message: error?.message || 'Invalid JSON body.'
            }
        });
        return;
    }

    const table = toString(body.table).toLowerCase();
    const action = toString(body.action || 'select').toLowerCase();
    const filters = normalizeFilters(body.filters);
    const orderBy = normalizeOrderBy(body.orderBy);
    const columns = toString(body.columns || '*');
    const single = Boolean(body.single);

    if (!table) {
        json(res, 400, { error: { code: 'INVALID_TABLE', message: 'table is required.' } });
        return;
    }
    if (!ALLOWED_ACTIONS.has(action)) {
        json(res, 400, { error: { code: 'INVALID_ACTION', message: `Unsupported action: ${action}` } });
        return;
    }

    if (
        WRITE_ACTIONS.has(action)
        && !applyRateLimit(res, `db:write:${clientIp}`, WRITE_MAX_REQUESTS, WRITE_WINDOW_MS)
    ) {
        return;
    }

    const accessCheck = await assertAccess(req, action, table);
    if (!accessCheck.ok) {
        json(res, accessCheck.statusCode, {
            error: {
                code: accessCheck.code,
                message: accessCheck.message
            },
            data: null
        });
        return;
    }

    try {
        if (action === 'select') {
            const data = await listRows(table, { filters, orderBy, columns, single });
            json(res, 200, { data, error: null });
            return;
        }

        if (action === 'insert') {
            const values = sanitizeRowsInput(body.values || []);
            const inserted = await insertRows(table, values);
            json(res, 200, { data: selectColumns(inserted, columns), error: null });
            return;
        }

        if (action === 'upsert') {
            const values = sanitizeRowsInput(body.values || []);
            const changed = await upsertRows(table, values, body.onConflict || 'id');
            json(res, 200, { data: changed, error: null });
            return;
        }

        if (action === 'update') {
            const patchValue = sanitizeJsonValue(body.values);
            const patch = patchValue && typeof patchValue === 'object' && !Array.isArray(patchValue)
                ? patchValue
                : {};
            const updated = await updateRows(table, patch, filters);
            json(res, 200, { data: updated, error: null });
            return;
        }

        const deleted = await deleteRows(table, filters);
        json(res, 200, { data: selectColumns(deleted, columns), error: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected DB error.';
        json(res, 500, { error: { code: 'DB_ERROR', message }, data: null });
    }
}
