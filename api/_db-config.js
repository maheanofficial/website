const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const sanitizeInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

const sanitizeSqlIdentifier = (value, fallback) => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+/, '')
        .replace(/_+$/, '');
    return normalized || fallback;
};

const DB_BACKEND = pickFirstEnv(
    'DB_BACKEND',
    'CPANEL_DB_BACKEND',
    'APP_DB_BACKEND'
).toLowerCase();

const MYSQL_HOST = pickFirstEnv('MYSQL_HOST', 'DB_HOST', 'CPANEL_DB_HOST');
const MYSQL_PORT = sanitizeInt(pickFirstEnv('MYSQL_PORT', 'DB_PORT', 'CPANEL_DB_PORT'), 3306);
const MYSQL_USER = pickFirstEnv('MYSQL_USER', 'DB_USER', 'CPANEL_DB_USER');
const MYSQL_PASSWORD = pickFirstEnv('MYSQL_PASSWORD', 'DB_PASSWORD', 'CPANEL_DB_PASSWORD');
const MYSQL_DATABASE = pickFirstEnv('MYSQL_DATABASE', 'DB_NAME', 'CPANEL_DB_NAME');

const MYSQL_TABLE_PREFIX = sanitizeSqlIdentifier(
    pickFirstEnv('MYSQL_TABLE_PREFIX', 'DB_TABLE_PREFIX', 'CPANEL_DB_TABLE_PREFIX'),
    'app_table'
);

const MYSQL_USERS_TABLE = sanitizeSqlIdentifier(
    pickFirstEnv('MYSQL_USERS_TABLE', 'DB_USERS_TABLE', 'CPANEL_DB_USERS_TABLE'),
    'app_users'
);

const isMysqlRequested = DB_BACKEND === 'mysql';
const isJsonRequested = DB_BACKEND === 'json';

const mysqlRequiredEnv = [
    ['MYSQL_HOST', MYSQL_HOST],
    ['MYSQL_USER', MYSQL_USER],
    ['MYSQL_DATABASE', MYSQL_DATABASE]
];

const missingMysqlConfig = mysqlRequiredEnv
    .filter(([, value]) => !value)
    .map(([key]) => key);

export const dbConfigError =
    isMysqlRequested && missingMysqlConfig.length
        ? `DB_BACKEND=mysql but missing env: ${missingMysqlConfig.join(', ')}`
        : '';

export const isMysqlConfigured = missingMysqlConfig.length === 0;

export const isMysqlEnabled =
    isMysqlRequested
    || (!isJsonRequested && isMysqlConfigured);

export const dbBackend = isMysqlEnabled ? 'mysql' : 'json';

export const mysqlConfig = isMysqlConfigured
    ? {
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE
    }
    : null;

export const mysqlTablePrefix = MYSQL_TABLE_PREFIX;
export const mysqlUsersTable = MYSQL_USERS_TABLE;

export const toMysqlSafeIdentifier = (value, fallback = '') =>
    sanitizeSqlIdentifier(value, fallback);

export const toMysqlDataTableName = (logicalTable) => {
    const safeLogicalName = sanitizeSqlIdentifier(logicalTable, '');
    if (!safeLogicalName) {
        throw new Error('Invalid table name.');
    }
    return `${MYSQL_TABLE_PREFIX}_${safeLogicalName}`;
};
