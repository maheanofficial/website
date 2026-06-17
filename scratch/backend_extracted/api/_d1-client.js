import { d1BindingName } from './_db-config.js';
import { getRuntimeEnv } from './_runtime-context.js';

const isD1DatabaseBinding = (value) =>
    value
    && typeof value.prepare === 'function'
    && typeof value.batch === 'function';

export const getD1Database = () => {
    const runtimeEnv = getRuntimeEnv();
    if (!runtimeEnv) {
        throw new Error('Cloudflare runtime context is unavailable for D1 operations.');
    }

    const database = runtimeEnv[d1BindingName];
    if (!isD1DatabaseBinding(database)) {
        throw new Error(`Cloudflare D1 binding "${d1BindingName}" is not configured.`);
    }

    return database;
};

export const d1All = async (sql, params = []) => {
    const result = await getD1Database()
        .prepare(String(sql || ''))
        .bind(...(Array.isArray(params) ? params : []))
        .all();

    return Array.isArray(result?.results) ? result.results : [];
};

export const d1Run = async (sql, params = []) =>
    getD1Database()
        .prepare(String(sql || ''))
        .bind(...(Array.isArray(params) ? params : []))
        .run();

export const d1Batch = async (statements = []) => {
    const source = Array.isArray(statements) ? statements : [];
    if (!source.length) return [];
    return getD1Database().batch(source);
};
