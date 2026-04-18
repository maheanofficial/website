const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const TABLES = [
  'stories',
  'authors',
  'profiles',
  'categories',
  'trash',
  'activity_logs',
  'login_history',
  'analytics_daily'
];

const TABLE_FILE_PREFIX = 'table-';

const pickFirstEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const toSafeIdentifier = (value, fallback = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
  return normalized || fallback;
};

const getBackendConfig = () => {
  const backendRaw = pickFirstEnv('DB_BACKEND', 'CPANEL_DB_BACKEND', 'APP_DB_BACKEND').toLowerCase();
  const mysql = {
    host: pickFirstEnv('MYSQL_HOST', 'DB_HOST', 'CPANEL_DB_HOST'),
    port: Number.parseInt(pickFirstEnv('MYSQL_PORT', 'DB_PORT', 'CPANEL_DB_PORT') || '3306', 10) || 3306,
    user: pickFirstEnv('MYSQL_USER', 'DB_USER', 'CPANEL_DB_USER'),
    password: pickFirstEnv('MYSQL_PASSWORD', 'DB_PASSWORD', 'CPANEL_DB_PASSWORD'),
    database: pickFirstEnv('MYSQL_DATABASE', 'DB_NAME', 'CPANEL_DB_NAME'),
    tablePrefix: toSafeIdentifier(
      pickFirstEnv('MYSQL_TABLE_PREFIX', 'DB_TABLE_PREFIX', 'CPANEL_DB_TABLE_PREFIX'),
      'app_table'
    ),
    usersTable: toSafeIdentifier(
      pickFirstEnv('MYSQL_USERS_TABLE', 'DB_USERS_TABLE', 'CPANEL_DB_USERS_TABLE'),
      'app_users'
    )
  };

  const missing = ['host', 'user', 'database'].filter((key) => !mysql[key]);
  const mysqlConfigured = missing.length === 0;
  const mysqlRequested = backendRaw === 'mysql';
  const jsonRequested = backendRaw === 'json';

  if (mysqlRequested && !mysqlConfigured) {
    throw new Error(`DB_BACKEND=mysql but missing env: ${missing.map((key) => `MYSQL_${key.toUpperCase()}`).join(', ')}`);
  }

  return {
    useMysql: mysqlRequested || (!jsonRequested && mysqlConfigured),
    mysql
  };
};

const ensureJsonFile = async (filePath, fallbackPayload) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid JSON shape');
    }
    return { path: filePath, action: 'exists' };
  } catch (error) {
    if (error && typeof error === 'object' && error.code !== 'ENOENT') {
      // Malformed file is replaced by safe default payload.
    }
    await fs.writeFile(filePath, JSON.stringify(fallbackPayload, null, 2), 'utf8');
    return { path: filePath, action: 'created' };
  }
};

const initJsonBackend = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const results = [];
  for (const table of TABLES) {
    const filePath = path.join(DATA_DIR, `${TABLE_FILE_PREFIX}${table}.json`);
    const result = await ensureJsonFile(filePath, { rows: [] });
    results.push(result);
  }

  const usersPath = path.join(DATA_DIR, 'users.json');
  const usersResult = await ensureJsonFile(usersPath, { users: [] });

  const created = [...results, usersResult].filter((entry) => entry.action === 'created');
  const existing = [...results, usersResult].filter((entry) => entry.action === 'exists');

  console.log('[db:init] backend: json');
  console.log(`[db:init] table files ready: ${results.length}`);
  console.log(`[db:init] users store: ${usersResult.action}`);
  console.log(`[db:init] created: ${created.length}, existing: ${existing.length}`);
};

const initMysqlBackend = async (mysqlConfig) => {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 4
  });

  const escapeIdentifier = (identifier) => {
    if (!/^[a-z0-9_]+$/i.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }
    return `\`${identifier}\``;
  };

  try {
    const usersTableSqlName = escapeIdentifier(mysqlConfig.usersTable);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${usersTableSqlName} (
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

    for (const logicalTable of TABLES) {
      const safeTable = toSafeIdentifier(logicalTable, '');
      if (!safeTable) {
        throw new Error(`Invalid logical table name: ${logicalTable}`);
      }
      const dataTableName = escapeIdentifier(`${mysqlConfig.tablePrefix}_${safeTable}`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${dataTableName} (
          pk BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          row_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (pk)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    console.log('[db:init] backend: mysql');
    console.log(`[db:init] data tables ready: ${TABLES.length}`);
    console.log(`[db:init] users table ready: ${mysqlConfig.usersTable}`);
  } finally {
    await pool.end();
  }
};

const run = async () => {
  const config = getBackendConfig();
  if (config.useMysql) {
    await initMysqlBackend(config.mysql);
    return;
  }

  await initJsonBackend();
};

run().catch((error) => {
  console.error('[db:init] failed:', error);
  process.exitCode = 1;
});

