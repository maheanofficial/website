import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TABLE_PREFIX = 'table-';

const toSafeTableName = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');

const tablePath = (table) => {
    const name = toSafeTableName(table);
    if (!name) {
        throw new Error('Invalid table name.');
    }
    return path.join(DATA_DIR, `${TABLE_PREFIX}${name}.json`);
};

const ensureDir = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
};

const readFileJson = async (filePath) => {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed;
    } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};

const writeFileJson = async (filePath, payload) => {
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
};

const toRows = (value) => (Array.isArray(value) ? value : []);

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
    return rows.filter((row) =>
        filters.every((filter) => {
            const op = String(filter?.op || '').toLowerCase();
            const column = String(filter?.column || '').trim();
            if (!op || !column) return true;
            return compareValue(row?.[column], op, filter?.value);
        })
    );
};

const applyOrder = (rows, orderBy) => {
    if (!orderBy || typeof orderBy !== 'object') return rows;
    const column = String(orderBy.column || '').trim();
    if (!column) return rows;
    const ascending = Boolean(orderBy.ascending);
    return [...rows].sort((a, b) => {
        const left = a?.[column];
        const right = b?.[column];
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

const tableLocks = new Map();

const withTableLock = async (table, callback) => {
    const previous = tableLocks.get(table) || Promise.resolve();
    let releaseCurrent = () => undefined;
    const current = new Promise((resolve) => {
        releaseCurrent = resolve;
    });
    tableLocks.set(table, current);
    await previous;

    try {
        return await callback();
    } finally {
        releaseCurrent();
        if (tableLocks.get(table) === current) {
            tableLocks.delete(table);
        }
    }
};

const readRowsUnlocked = async (table) => {
    await ensureDir();
    const filePath = tablePath(table);
    const parsed = await readFileJson(filePath);
    const rows = toRows(parsed?.rows);
    return rows;
};

const writeRowsUnlocked = async (table, rows) => {
    await ensureDir();
    const filePath = tablePath(table);
    await writeFileJson(filePath, { rows: toRows(rows) });
};

export const listRows = async (table, options = {}) => {
    const rows = await readRowsUnlocked(table);
    const filtered = applyFilters(rows, options.filters);
    const ordered = applyOrder(filtered, options.orderBy);
    const selected = pickColumnsFromRows(ordered, options.columns);
    if (options.single) {
        return selected[0] || null;
    }
    return selected;
};

export const insertRows = async (table, values) =>
    withTableLock(table, async () => {
        const rows = await readRowsUnlocked(table);
        const inserts = Array.isArray(values) ? values : [values];
        const normalized = inserts.filter((entry) => entry && typeof entry === 'object');
        const nextRows = [...rows, ...normalized];
        await writeRowsUnlocked(table, nextRows);
        return normalized;
    });

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

export const upsertRows = async (table, values, onConflict = 'id') =>
    withTableLock(table, async () => {
        const rows = await readRowsUnlocked(table);
        const incomingRows = (Array.isArray(values) ? values : [values])
            .filter((entry) => entry && typeof entry === 'object');
        const conflictColumns = toConflictColumns(onConflict);
        const nextRows = [...rows];
        const changed = [];

        incomingRows.forEach((incomingRow) => {
            let matchIndex = -1;
            if (conflictColumns.length) {
                matchIndex = nextRows.findIndex((existingRow) =>
                    rowMatchesConflict(existingRow, incomingRow, conflictColumns)
                );
            }

            if (matchIndex >= 0) {
                nextRows[matchIndex] = {
                    ...nextRows[matchIndex],
                    ...incomingRow
                };
                changed.push(nextRows[matchIndex]);
            } else {
                nextRows.push(incomingRow);
                changed.push(incomingRow);
            }
        });

        await writeRowsUnlocked(table, nextRows);
        return changed;
    });

export const updateRows = async (table, patch, filters = []) =>
    withTableLock(table, async () => {
        const rows = await readRowsUnlocked(table);
        const nextRows = rows.map((row) => {
            const matches = applyFilters([row], filters).length > 0;
            if (!matches) return row;
            return {
                ...row,
                ...patch
            };
        });
        await writeRowsUnlocked(table, nextRows);
        return applyFilters(nextRows, filters);
    });

export const deleteRows = async (table, filters = []) =>
    withTableLock(table, async () => {
        const rows = await readRowsUnlocked(table);
        const matches = applyFilters(rows, filters);
        const remaining = rows.filter((row) => !matches.includes(row));
        await writeRowsUnlocked(table, remaining);
        return matches;
    });
