import { d1All, d1Batch, d1Run, getD1Database } from './_d1-client.js';
import { gunzipSync, gzipSync } from 'node:zlib';

const STORE_TABLE_NAME = 'app_table_rows';
const STORE_TABLE_IDENTIFIER = `"${STORE_TABLE_NAME}"`;
const TABLE_NAME_PATTERN = /^[a-z0-9_-]+$/;
const COMPRESSED_ROW_FORMAT = 'gzip-base64-json-v1';
const parsePositiveIntegerEnv = (value, fallback) => {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};
const D1_ROW_JSON_COMPRESSION_THRESHOLD_BYTES = parsePositiveIntegerEnv(
    process.env.D1_ROW_JSON_COMPRESSION_THRESHOLD_BYTES,
    256_000
);
const D1_ROW_JSON_MAX_BYTES = Math.max(
    D1_ROW_JSON_COMPRESSION_THRESHOLD_BYTES,
    parsePositiveIntegerEnv(process.env.D1_ROW_JSON_MAX_BYTES, 6_000_000)
);

const storeReadyState = {
    promise: null
};

const normalizeLogicalTableName = (value) =>
    String(value || '')
        .trim()
        .toLowerCase();

const toStoreTableName = (value) => {
    const tableName = normalizeLogicalTableName(value);
    if (!TABLE_NAME_PATTERN.test(tableName)) {
        throw new Error('Invalid table name.');
    }
    return tableName;
};

export const ensureD1StoreReady = async () => {
    if (storeReadyState.promise) {
        return storeReadyState.promise;
    }

    storeReadyState.promise = (async () => {
        await d1Run(`
            CREATE TABLE IF NOT EXISTS ${STORE_TABLE_IDENTIFIER} (
                pk INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                row_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);
        await d1Run(`
            CREATE INDEX IF NOT EXISTS idx_app_table_rows_table_name
            ON ${STORE_TABLE_IDENTIFIER}(table_name)
        `);
    })();

    try {
        await storeReadyState.promise;
    } catch (error) {
        storeReadyState.promise = null;
        throw error;
    }
};

const toRows = (value) => (Array.isArray(value) ? value : []);

const decodeMaybeCompressedPayload = (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return payload;
    }
    if (payload.__format !== COMPRESSED_ROW_FORMAT || typeof payload.data !== 'string') {
        return payload;
    }

    try {
        const compressed = Buffer.from(payload.data, 'base64');
        const raw = gunzipSync(compressed).toString('utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const parseRowJson = (rowJson) => {
    try {
        const parsed = decodeMaybeCompressedPayload(JSON.parse(String(rowJson || '{}')));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Ignore parse errors and return empty object.
    }
    return {};
};

const toMemoryRows = (dbRows) =>
    toRows(dbRows).map((entry) => ({
        pk: Number(entry?.pk) || 0,
        row: parseRowJson(entry?.row_json)
    }));

const compareValue = (left, op, right) => {
    if (op === 'eq') return left === right;
    if (op === 'neq') return left !== right;
    if (op === 'lt') {
        if (typeof left === 'number' && typeof right === 'number') {
            return left < right;
        }
        const leftDate = new Date(String(left || ''));
        const rightDate = new Date(String(right || ''));
        if (!Number.isNaN(leftDate.getTime()) && !Number.isNaN(rightDate.getTime())) {
            return leftDate.getTime() < rightDate.getTime();
        }
        return String(left || '') < String(right || '');
    }
    return false;
};

const applyFilters = (rows, filters) => {
    if (!Array.isArray(filters) || !filters.length) return rows;
    return rows.filter((entry) =>
        filters.every((filter) => {
            const op = String(filter?.op || '').toLowerCase();
            const column = String(filter?.column || '').trim();
            if (!op || !column) return true;
            return compareValue(entry?.row?.[column], op, filter?.value);
        })
    );
};

const applyOrder = (rows, orderBy) => {
    if (!orderBy || typeof orderBy !== 'object') return rows;
    const column = String(orderBy.column || '').trim();
    if (!column) return rows;
    const ascending = Boolean(orderBy.ascending);
    return [...rows].sort((leftEntry, rightEntry) => {
        const left = leftEntry?.row?.[column];
        const right = rightEntry?.row?.[column];
        if (left === right) return 0;

        const leftDate = new Date(String(left || ''));
        const rightDate = new Date(String(right || ''));
        const bothDates = !Number.isNaN(leftDate.getTime()) && !Number.isNaN(rightDate.getTime());

        let result;
        if (bothDates) {
            result = leftDate.getTime() - rightDate.getTime();
        } else if (typeof left === 'number' && typeof right === 'number') {
            result = left - right;
        } else {
            result = String(left || '').localeCompare(String(right || ''));
        }

        return ascending ? result : -result;
    });
};

const parseColumns = (columns) => {
    const value = String(columns || '*').trim();
    if (!value || value === '*') return null;
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const pickColumns = (row, columns) => {
    if (!columns || !columns.length) return row;
    const next = {};
    columns.forEach((column) => {
        next[column] = row?.[column];
    });
    return next;
};

const pickColumnsFromRows = (rows, columns) => {
    const selected = parseColumns(columns);
    if (!selected) return rows;
    return rows.map((row) => pickColumns(row, selected));
};

const normalizeIncomingRows = (value) => {
    const source = Array.isArray(value) ? value : [value];
    return source.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
};

const serializeRowJson = (row) => {
    const rawJson = JSON.stringify(row ?? {});
    if (Buffer.byteLength(rawJson, 'utf8') <= D1_ROW_JSON_COMPRESSION_THRESHOLD_BYTES) {
        return rawJson;
    }

    const compressedBase64 = gzipSync(Buffer.from(rawJson, 'utf8')).toString('base64');
    const wrapped = JSON.stringify({
        __format: COMPRESSED_ROW_FORMAT,
        data: compressedBase64
    });

    if (Buffer.byteLength(wrapped, 'utf8') > D1_ROW_JSON_MAX_BYTES) {
        throw new Error('Row payload is too large for D1 even after compression.');
    }

    return wrapped;
};

const toConflictColumns = (onConflict) =>
    String(onConflict || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

const rowMatchesConflict = (existingRow, incomingRow, columns) =>
    columns.every((column) => {
        if (!(column in existingRow) || !(column in incomingRow)) return false;
        return existingRow[column] === incomingRow[column];
    });

const listDbRowsByTable = async (logicalTable) => {
    await ensureD1StoreReady();
    return d1All(
        `SELECT pk, row_json FROM ${STORE_TABLE_IDENTIFIER} WHERE table_name = ? ORDER BY pk ASC`,
        [toStoreTableName(logicalTable)]
    );
};

export const listRows = async (table, options = {}) => {
    const dbRows = await listDbRowsByTable(table);
    const rows = toMemoryRows(dbRows);
    const filtered = applyFilters(rows, options.filters);
    const ordered = applyOrder(filtered, options.orderBy);
    const selected = pickColumnsFromRows(ordered.map((entry) => entry.row), options.columns);
    if (options.single) {
        return selected[0] || null;
    }
    return selected;
};

export const insertRows = async (table, values) => {
    await ensureD1StoreReady();
    const logicalTable = toStoreTableName(table);
    const incomingRows = normalizeIncomingRows(values);
    if (!incomingRows.length) {
        return [];
    }

    const now = new Date().toISOString();
    const db = getD1Database();
    const statements = incomingRows.map((entry) =>
        db.prepare(
            `INSERT INTO ${STORE_TABLE_IDENTIFIER} (table_name, row_json, created_at, updated_at)
             VALUES (?, ?, ?, ?)`
        ).bind(logicalTable, serializeRowJson(entry), now, now)
    );
    await d1Batch(statements);
    return incomingRows;
};

export const upsertRows = async (table, values, onConflict = 'id') => {
    await ensureD1StoreReady();
    const logicalTable = toStoreTableName(table);
    const conflictColumns = toConflictColumns(onConflict);
    const incomingRows = normalizeIncomingRows(values);
    if (!incomingRows.length) {
        return [];
    }

    const dbRows = await listDbRowsByTable(logicalTable);
    const existingRows = toMemoryRows(dbRows);
    const changed = [];
    const statements = [];
    const now = new Date().toISOString();
    const db = getD1Database();

    for (const incomingRow of incomingRows) {
        let matchIndex = -1;
        if (conflictColumns.length) {
            matchIndex = existingRows.findIndex((entry) =>
                rowMatchesConflict(entry.row, incomingRow, conflictColumns)
            );
        }

        if (matchIndex >= 0) {
            const nextRow = {
                ...existingRows[matchIndex].row,
                ...incomingRow
            };
            const targetPk = existingRows[matchIndex].pk;
            existingRows[matchIndex] = { pk: targetPk, row: nextRow };
            statements.push(
                db.prepare(
                    `UPDATE ${STORE_TABLE_IDENTIFIER} SET row_json = ?, updated_at = ? WHERE pk = ?`
                ).bind(serializeRowJson(nextRow), now, targetPk)
            );
            changed.push(nextRow);
        } else {
            statements.push(
                db.prepare(
                    `INSERT INTO ${STORE_TABLE_IDENTIFIER} (table_name, row_json, created_at, updated_at)
                     VALUES (?, ?, ?, ?)`
                ).bind(logicalTable, serializeRowJson(incomingRow), now, now)
            );
            changed.push(incomingRow);
        }
    }

    await d1Batch(statements);
    return changed;
};

export const updateRows = async (table, patch, filters = []) => {
    await ensureD1StoreReady();
    const normalizedPatch =
        patch && typeof patch === 'object' && !Array.isArray(patch)
            ? patch
            : {};
    const dbRows = await listDbRowsByTable(table);
    const existingRows = toMemoryRows(dbRows);
    const matches = applyFilters(existingRows, filters);
    if (!matches.length) {
        return [];
    }

    const now = new Date().toISOString();
    const db = getD1Database();
    const statements = [];
    const updatedRows = [];

    for (const entry of matches) {
        const nextRow = {
            ...entry.row,
            ...normalizedPatch
        };
        statements.push(
            db.prepare(
                `UPDATE ${STORE_TABLE_IDENTIFIER} SET row_json = ?, updated_at = ? WHERE pk = ?`
            ).bind(serializeRowJson(nextRow), now, entry.pk)
        );
        updatedRows.push(nextRow);
    }

    await d1Batch(statements);
    return updatedRows;
};

export const deleteRows = async (table, filters = []) => {
    await ensureD1StoreReady();
    const dbRows = await listDbRowsByTable(table);
    const existingRows = toMemoryRows(dbRows);
    const matches = applyFilters(existingRows, filters);
    if (!matches.length) {
        return [];
    }

    const db = getD1Database();
    const statements = matches.map((entry) =>
        db.prepare(`DELETE FROM ${STORE_TABLE_IDENTIFIER} WHERE pk = ?`).bind(entry.pk)
    );
    await d1Batch(statements);
    return matches.map((entry) => entry.row);
};
