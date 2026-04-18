#!/usr/bin/env node

/*
 * Create a compressed JSON backup of application MySQL tables.
 * Backups include:
 * - users table (default: app_users)
 * - data tables prefixed with table prefix (default: app_table_)
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const mysql = require('mysql2/promise');

const pickFirstEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const sanitizeHost = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const withoutScheme = raw.replace(/^https?:\/\//i, '');
  const hostPart = withoutScheme.split('/')[0] || '';
  return hostPart.split(':')[0] || '';
};

const sanitizeIdentifier = (value, fallback) => {
  const normalized = String(value || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');
  if (!normalized) {
    return fallback;
  }
  return normalized;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    out: ''
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--out') {
      parsed.out = String(args[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (value === '--help' || value === '-h') {
      parsed.help = true;
    }
  }

  return parsed;
};

const usage = () => {
  console.log('Usage: node scripts/create-mysql-backup.cjs [--out <path/to/backup.json.gz>]');
};

const toTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-');

const createOutputPath = (targetFile) => {
  if (targetFile) {
    return path.resolve(process.cwd(), targetFile);
  }

  const outputDir = path.resolve(process.cwd(), 'backups');
  const filename = `mysql-backup-${toTimestamp()}.json.gz`;
  return path.join(outputDir, filename);
};

const assertRequiredEnv = (config) => {
  const missing = [];
  if (!config.host) missing.push('MYSQL_HOST');
  if (!config.user) missing.push('MYSQL_USER');
  if (!config.password) missing.push('MYSQL_PASSWORD');
  if (missing.length > 0) {
    throw new Error(`Missing required MySQL env: ${missing.join(', ')}`);
  }
};

const getMysqlConfig = () => {
  const host = sanitizeHost(pickFirstEnv('MYSQL_HOST', 'DB_HOST', 'CPANEL_DB_HOST', 'CPANEL_HOST'));
  const portRaw = pickFirstEnv('MYSQL_PORT', 'DB_PORT', 'CPANEL_DB_PORT');
  const port = Number.parseInt(portRaw || '3306', 10) || 3306;
  const user = pickFirstEnv('MYSQL_USER', 'DB_USER', 'CPANEL_DB_USER', 'CPANEL_USER');
  const password = pickFirstEnv('MYSQL_PASSWORD', 'DB_PASSWORD', 'CPANEL_DB_PASSWORD', 'CPANEL_PASSWORD');
  const database = pickFirstEnv('MYSQL_DATABASE', 'DB_NAME', 'CPANEL_DB_NAME');
  const tablePrefix = sanitizeIdentifier(
    pickFirstEnv('MYSQL_TABLE_PREFIX', 'DB_TABLE_PREFIX', 'CPANEL_DB_TABLE_PREFIX'),
    'app_table'
  );
  const usersTable = sanitizeIdentifier(
    pickFirstEnv('MYSQL_USERS_TABLE', 'DB_USERS_TABLE', 'CPANEL_DB_USERS_TABLE'),
    'app_users'
  );

  return {
    host,
    port,
    user,
    password,
    database,
    tablePrefix,
    usersTable
  };
};

const systemSchemas = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);

const detectDatabaseName = async (config) => {
  if (config.database) {
    return config.database;
  }

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password
  });

  try {
    const [rows] = await connection.query('SHOW DATABASES');
    const key = Object.keys(rows?.[0] || {})[0];
    const candidates = (rows || [])
      .map((row) => String(row[key] || '').trim())
      .filter((value) => value && !systemSchemas.has(value));

    if (candidates.length === 1) {
      return candidates[0];
    }

    const guessedByUser = candidates.find((value) => value === `${config.user}_site`);
    if (guessedByUser) {
      return guessedByUser;
    }

    throw new Error(
      `MYSQL_DATABASE is not set and auto-detection is ambiguous. Found: ${candidates.join(', ') || 'none'}`
    );
  } finally {
    await connection.end();
  }
};

const listTargetTables = async (connection, tablePrefix, usersTable) => {
  const [rows] = await connection.query('SHOW TABLES');
  if (!rows || rows.length === 0) {
    return [];
  }

  const key = Object.keys(rows[0] || {})[0];
  const allTables = rows
    .map((row) => String(row[key] || '').trim())
    .filter(Boolean);

  const prefix = `${tablePrefix}_`;
  return allTables
    .filter((tableName) => tableName === usersTable || tableName.startsWith(prefix))
    .sort((left, right) => left.localeCompare(right));
};

const fetchTableRows = async (connection, tableName) => {
  const [rows] = await connection.query('SELECT * FROM ??', [tableName]);
  return rows;
};

const run = async () => {
  const args = parseArgs();
  if (args.help) {
    usage();
    process.exit(0);
  }

  const config = getMysqlConfig();
  assertRequiredEnv(config);
  const databaseName = await detectDatabaseName(config);

  const outputPath = createOutputPath(args.out);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: databaseName
  });

  try {
    const tables = await listTargetTables(connection, config.tablePrefix, config.usersTable);
    if (tables.length === 0) {
      throw new Error(
        `No tables found for prefix "${config.tablePrefix}_" and users table "${config.usersTable}".`
      );
    }

    const backup = {
      metadata: {
        createdAt: new Date().toISOString(),
        database: databaseName,
        host: config.host,
        port: config.port,
        tablePrefix: config.tablePrefix,
        usersTable: config.usersTable,
        tableCount: tables.length
      },
      tables: {}
    };

    for (const tableName of tables) {
      const rows = await fetchTableRows(connection, tableName);
      backup.tables[tableName] = rows;
      console.log(`[backup] ${tableName}: ${rows.length} row(s)`);
    }

    const jsonBuffer = Buffer.from(JSON.stringify(backup, null, 2), 'utf8');
    const compressed = zlib.gzipSync(jsonBuffer, { level: zlib.constants.Z_BEST_COMPRESSION });
    fs.writeFileSync(outputPath, compressed);

    console.log(`[backup] wrote ${outputPath}`);
    console.log(`[backup] size: ${compressed.length} bytes`);
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(`[backup] failed: ${error.message}`);
  process.exitCode = 1;
});
