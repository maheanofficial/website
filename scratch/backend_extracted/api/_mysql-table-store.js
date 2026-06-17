import { getMysqlPool, mysqlQuery, withMysqlTransaction } from './_mysql-client.js';
import { toMysqlDataTableName } from './_db-config.js';

const tableReadyPromises = new Map();

const toSafeTableName = (logicalTable) => toMysqlDataTableName(logicalTable);

const escapeIdentifier = (identifier) => {
    if (!/^[a-z0-9_]+$/i.test(identifier)) {
        throw new Error('Invalid SQL identifier.');
    }
    return `\`${identifier}\``;
};

const toTableIdentifier = (logicalTable) =>
    escapeIdentifier(toSafeTableName(logicalTable));

const ensureTableReady = async (logicalTable) => {
    const safeTableName = toSafeTableName(logicalTable);
    if (tableReadyPromises.has(safeTableName)) {
        return tableReadyPromises.get(safeTableName);
    }

    const tableIdentifier = escapeIdentifier(safeTableName);
    const promise = mysqlQuery(`
        CREATE TABLE IF NOT EXISTS ${tableIdentifier} (
            pk BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            row_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (pk)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    tableReadyPromises.set(safeTableName, promise);
    try {
        await promise;
    } catch (error) {
        tableReadyPromises.delete(safeTableName);
        throw error;
    }
};

const toRows = (value) => (Array.isArray(value) ? value : []);

const parseRowJson = (rowJson) => {
    try {
        const parsed = JSON.parse(String(rowJson || '{}'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Ignore parse errors and fall back to empty row object.
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

const serializeRowJson = (row) => JSON.stringify(row ?? {});

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

export const listRows = async (table, options = {}) => {
    await ensureTableReady(table);
    const tableIdentifier = toTableIdentifier(table);
    const dbRows = await mysqlQuery(`SELECT pk, row_json FROM ${tableIdentifier} ORDER BY pk ASC`);
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
    await ensureTableReady(table);
    const tableIdentifier = toTableIdentifier(table);
    const incomingRows = normalizeIncomingRows(values);
    if (!incomingRows.length) {
        return [];
    }

    const placeholders = incomingRows.map(() => '(?)').join(', ');
    const params = incomingRows.map((entry) => serializeRowJson(entry));
    await mysqlQuery(`INSERT INTO ${tableIdentifier} (row_json) VALUES ${placeholders}`, params);
    return incomingRows;
};

export const upsertRows = async (table, values, onConflict = 'id') => {
    await ensureTableReady(table);
    const tableIdentifier = toTableIdentifier(table);
    const conflictColumns = toConflictColumns(onConflict);
    const incomingRows = normalizeIncomingRows(values);
    if (!incomingRows.length) {
        return [];
    }

    const changed = [];

    await withMysqlTransaction(async (connection) => {
        const [rawRows] = await connection.query(
            `SELECT pk, row_json FROM ${tableIdentifier} ORDER BY pk ASC FOR UPDATE`
        );
        const existingRows = toMemoryRows(rawRows);

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
                await connection.query(
                    `UPDATE ${tableIdentifier} SET row_json = ? WHERE pk = ?`,
                    [serializeRowJson(nextRow), targetPk]
                );
                changed.push(nextRow);
            } else {
                const [insertResult] = await connection.query(
                    `INSERT INTO ${tableIdentifier} (row_json) VALUES (?)`,
                    [serializeRowJson(incomingRow)]
                );
                const insertId = Number(insertResult?.insertId) || 0;
                existingRows.push({ pk: insertId, row: incomingRow });
                changed.push(incomingRow);
            }
        }
    });

    return changed;
};

export const updateRows = async (table, patch, filters = []) => {
    await ensureTableReady(table);
    const tableIdentifier = toTableIdentifier(table);
    const normalizedPatch =
        patch && typeof patch === 'object' && !Array.isArray(patch)
            ? patch
            : {};
    const updatedRows = [];

    await withMysqlTransaction(async (connection) => {
        const [rawRows] = await connection.query(
            `SELECT pk, row_json FROM ${tableIdentifier} ORDER BY pk ASC FOR UPDATE`
        );
        const existingRows = toMemoryRows(rawRows);
        const matches = applyFilters(existingRows, filters);

        for (const entry of matches) {
            const nextRow = {
                ...entry.row,
                ...normalizedPatch
            };
            await connection.query(
                `UPDATE ${tableIdentifier} SET row_json = ? WHERE pk = ?`,
                [serializeRowJson(nextRow), entry.pk]
            );
            updatedRows.push(nextRow);
        }
    });

    return updatedRows;
};

export const deleteRows = async (table, filters = []) => {
    await ensureTableReady(table);
    const tableIdentifier = toTableIdentifier(table);
    const deletedRows = [];

    await withMysqlTransaction(async (connection) => {
        const [rawRows] = await connection.query(
            `SELECT pk, row_json FROM ${tableIdentifier} ORDER BY pk ASC FOR UPDATE`
        );
        const existingRows = toMemoryRows(rawRows);
        const matches = applyFilters(existingRows, filters);

        if (!matches.length) {
            return;
        }

        const placeholderList = matches.map(() => '?').join(', ');
        const matchIds = matches.map((entry) => entry.pk);
        await connection.query(
            `DELETE FROM ${tableIdentifier} WHERE pk IN (${placeholderList})`,
            matchIds
        );
        matches.forEach((entry) => {
            deletedRows.push(entry.row);
        });
    });

    return deletedRows;
};

// Exported for setup scripts and migration tooling.
export const ensureMysqlDataTable = ensureTableReady;
export const toMysqlDataTableIdentifier = toTableIdentifier;
export const getMysqlDataTableName = toSafeTableName;
export const mysqlPool = getMysqlPool;

