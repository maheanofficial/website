const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_SOURCE_DIR = path.join(ROOT_DIR, 'data');

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
const INSERT_BATCH_SIZE = 200;

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

const parseArgs = (argv) => {
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  const result = {
    sourceDir: DEFAULT_SOURCE_DIR,
    truncate: true
  };

  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (current === '--source' || current === '-s') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--source requires a value');
      }
      result.sourceDir = path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    if (current === '--no-truncate') {
      result.truncate = false;
      continue;
    }
    if (current === '--truncate') {
      result.truncate = true;
      continue;
    }
    if (current === '--help' || current === '-h') {
      result.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${current}`);
  }

  return result;
};

const usage = () => {
  console.log('Usage: node scripts/migrate-json-to-mysql.cjs [--source <dir>] [--truncate|--no-truncate]');
  console.log('Defaults: --source ./data --truncate');
};

const getMysqlConfig = () => {
  const backend = pickFirstEnv('DB_BACKEND', 'CPANEL_DB_BACKEND', 'APP_DB_BACKEND').toLowerCase();
  if (backend && backend !== 'mysql') {
    throw new Error(`DB_BACKEND is "${backend}". Set DB_BACKEND=mysql before migrating.`);
  }

  const config = {
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

  const missing = ['host', 'user', 'database'].filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing MySQL env: ${missing.map((key) => `MYSQL_${key.toUpperCase()}`).join(', ')}`);
  }

  return config;
};

const stripBom = (raw) => String(raw || '').replace(/^\uFEFF/, '');

const readJsonFile = async (filePath, fallbackValue) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(stripBom(raw));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
};

const toRows = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.rows)) {
    return value.rows;
  }
  return [];
};

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

const normalizeProviders = (value) => {
  const source = Array.isArray(value) ? value : [];
  const providers = source
    .map((entry) => normalizeIdentifier(entry))
    .filter(Boolean);
  if (!providers.length) return ['local'];
  return Array.from(new Set(providers));
};

const normalizeUser = (value) => {
  const user = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const email = normalizeIdentifier(user.email || user.username || '');
  const username = normalizeIdentifier(user.username || email);
  return {
    id: String(user.id || randomUUID()),
    username,
    email: email || null,
    password: String(user.password || ''),
    role: user.role === 'admin' ? 'admin' : 'moderator',
    createdAt: String(user.createdAt || new Date().toISOString()),
    displayName: String(user.displayName || username.split('@')[0] || 'user'),
    photoURL: typeof user.photoURL === 'string' ? user.photoURL : null,
    providers: normalizeProviders(user.providers)
  };
};

const readTableSourceRows = async (sourceDir, tableName) => {
  const filePath = path.join(sourceDir, `${TABLE_FILE_PREFIX}${tableName}.json`);
  const parsed = await readJsonFile(filePath, { rows: [] });
  return toRows(parsed).filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
};

const readUsersSourceRows = async (sourceDir) => {
  const filePath = path.join(sourceDir, 'users.json');
  const parsed = await readJsonFile(filePath, { users: [] });
  const users = parsed && typeof parsed === 'object' && Array.isArray(parsed.users)
    ? parsed.users
    : [];
  return users.map(normalizeUser);
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const escapeIdentifier = (identifier) => {
  if (!/^[a-z0-9_]+$/i.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
};

const ensureTables = async (connection, mysqlConfig) => {
  const usersTableSqlName = escapeIdentifier(mysqlConfig.usersTable);
  await connection.query(`
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
    const safeLogical = toSafeIdentifier(logicalTable, '');
    if (!safeLogical) {
      throw new Error(`Invalid logical table name: ${logicalTable}`);
    }
    const tableIdentifier = escapeIdentifier(`${mysqlConfig.tablePrefix}_${safeLogical}`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ${tableIdentifier} (
        pk BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        row_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (pk)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const migrateTableRows = async (connection, mysqlConfig, tableName, rows, truncate) => {
  const tableIdentifier = escapeIdentifier(`${mysqlConfig.tablePrefix}_${toSafeIdentifier(tableName, tableName)}`);

  if (truncate) {
    await connection.query(`DELETE FROM ${tableIdentifier}`);
  }

  if (!rows.length) {
    return;
  }

  const chunks = chunkArray(rows, INSERT_BATCH_SIZE);
  for (const chunk of chunks) {
    const placeholders = chunk.map(() => '(?)').join(', ');
    const params = chunk.map((entry) => JSON.stringify(entry));
    await connection.query(
      `INSERT INTO ${tableIdentifier} (row_json) VALUES ${placeholders}`,
      params
    );
  }
};

const migrateUsers = async (connection, mysqlConfig, users, truncate) => {
  const usersTableSqlName = escapeIdentifier(mysqlConfig.usersTable);

  if (truncate) {
    await connection.query(`DELETE FROM ${usersTableSqlName}`);
  }

  for (const user of users) {
    await connection.query(
      `INSERT INTO ${usersTableSqlName}
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
};

const run = async () => {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const mysqlConfig = getMysqlConfig();
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

  const sourceDir = args.sourceDir;
  const users = await readUsersSourceRows(sourceDir);

  const tableToRows = new Map();
  for (const tableName of TABLES) {
    const rows = await readTableSourceRows(sourceDir, tableName);
    tableToRows.set(tableName, rows);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensureTables(connection, mysqlConfig);

    let totalRows = 0;
    for (const tableName of TABLES) {
      const rows = tableToRows.get(tableName) || [];
      await migrateTableRows(connection, mysqlConfig, tableName, rows, args.truncate);
      totalRows += rows.length;
      console.log(`[db:migrate] ${tableName}: ${rows.length} row(s)`);
    }

    await migrateUsers(connection, mysqlConfig, users, args.truncate);
    console.log(`[db:migrate] users: ${users.length} row(s)`);

    await connection.commit();
    console.log(`[db:migrate] done. source=${sourceDir}, truncate=${args.truncate}, totalRows=${totalRows + users.length}`);
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error('[db:migrate] failed:', error);
  process.exitCode = 1;
});

