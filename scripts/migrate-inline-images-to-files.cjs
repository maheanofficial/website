const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_UPLOAD_DIR = path.join(ROOT_DIR, 'dist', 'uploads');
const PUBLIC_UPLOAD_DIR = path.join(ROOT_DIR, 'public', 'uploads');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TABLE_FILE_PREFIX = 'table-';

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

const DATA_URL_EXACT_REGEX = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
const DATA_URL_INLINE_REGEX = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi;

const pickFirstEnv = (...keys) => {
  const normalize = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      return value.slice(1, -1).trim();
    }
    return value;
  };

  for (const key of keys) {
    const value = normalize(process.env[key]);
    if (value) {
      return value;
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

const sanitizePathSegment = (value, fallback = 'migrated') => {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  return normalized || fallback;
};

const extFromMime = (mime) => {
  const value = String(mime || '').toLowerCase();
  if (value === 'image/jpeg' || value === 'image/jpg') return 'jpg';
  if (value === 'image/png') return 'png';
  if (value === 'image/webp') return 'webp';
  if (value === 'image/gif') return 'gif';
  if (value === 'image/avif') return 'avif';
  return 'bin';
};

const parseDataUrl = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(DATA_URL_EXACT_REGEX);
  if (!match) return null;
  return {
    mime: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, '')
  };
};

const dataUrlCache = new Map();
let savedFiles = 0;

const saveDataUrlAsFile = async (dataUrl, folderHint) => {
  const key = String(dataUrl || '').trim();
  if (!key) return null;
  if (dataUrlCache.has(key)) return dataUrlCache.get(key);

  const parsed = parseDataUrl(key);
  if (!parsed) return null;

  let bytes;
  try {
    bytes = Buffer.from(parsed.base64, 'base64');
  } catch {
    return null;
  }

  if (!bytes.length) return null;

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const folder = sanitizePathSegment(folderHint, 'migrated');
  const ext = extFromMime(parsed.mime);
  const fileName = `${randomUUID()}.${ext}`;
  const relativeDir = [folder, year, month].join('/');
  const relativePath = `${relativeDir}/${fileName}`;

  const writeIn = async (baseDir) => {
    const targetDir = path.join(baseDir, relativeDir);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, fileName), bytes);
  };

  await writeIn(DIST_UPLOAD_DIR);
  await writeIn(PUBLIC_UPLOAD_DIR).catch(() => undefined);

  const url = `/uploads/${relativePath}`;
  dataUrlCache.set(key, url);
  savedFiles += 1;
  return url;
};

const replaceInlineDataUrls = async (value, folderHint) => {
  const source = String(value || '');
  const matches = source.match(DATA_URL_INLINE_REGEX);
  if (!matches || !matches.length) {
    return { value: source, changed: false, replacements: 0 };
  }

  const uniqueMatches = Array.from(new Set(matches));
  let nextValue = source;
  let replacements = 0;

  for (const match of uniqueMatches) {
    const savedUrl = await saveDataUrlAsFile(match, `${folderHint}/inline`);
    if (!savedUrl) continue;
    if (!nextValue.includes(match)) continue;
    nextValue = nextValue.split(match).join(savedUrl);
    replacements += 1;
  }

  return {
    value: nextValue,
    changed: nextValue !== source,
    replacements
  };
};

const transformValue = async (value, folderHint) => {
  if (typeof value === 'string') {
    const direct = await saveDataUrlAsFile(value, folderHint);
    if (direct) {
      return { value: direct, changed: true };
    }
    const replaced = await replaceInlineDataUrls(value, folderHint);
    if (replaced.changed) {
      return { value: replaced.value, changed: true };
    }
    return { value, changed: false };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = [];
    for (const entry of value) {
      const transformed = await transformValue(entry, folderHint);
      next.push(transformed.value);
      if (transformed.changed) changed = true;
    }
    return { value: changed ? next : value, changed };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      const transformed = await transformValue(entry, `${folderHint}/${key}`);
      next[key] = transformed.value;
      if (transformed.changed) changed = true;
    }
    return { value: changed ? next : value, changed };
  }

  return { value, changed: false };
};

const readJsonFile = async (filePath, fallbackValue) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(String(raw).replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
};

const migrateJsonTableFile = async (tableName) => {
  const filePath = path.join(DATA_DIR, `${TABLE_FILE_PREFIX}${tableName}.json`);
  const parsed = await readJsonFile(filePath, { rows: [] });
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  let changedRows = 0;
  const nextRows = [];

  for (const row of rows) {
    const transformed = await transformValue(row, tableName);
    nextRows.push(transformed.value);
    if (transformed.changed) changedRows += 1;
  }

  if (changedRows > 0) {
    await fs.writeFile(filePath, JSON.stringify({ rows: nextRows }, null, 2), 'utf8');
  }

  return { filePath, totalRows: rows.length, changedRows };
};

const migrateJsonUsersFile = async () => {
  const filePath = path.join(DATA_DIR, 'users.json');
  const parsed = await readJsonFile(filePath, { users: [] });
  const users = Array.isArray(parsed?.users) ? parsed.users : [];
  let changedUsers = 0;
  const nextUsers = [];

  for (const user of users) {
    const transformed = await transformValue(user, 'users');
    nextUsers.push(transformed.value);
    if (transformed.changed) changedUsers += 1;
  }

  if (changedUsers > 0) {
    await fs.writeFile(filePath, JSON.stringify({ users: nextUsers }, null, 2), 'utf8');
  }

  return { filePath, totalUsers: users.length, changedUsers };
};

const mysqlConfig = () => {
  const backend = pickFirstEnv('DB_BACKEND', 'CPANEL_DB_BACKEND', 'APP_DB_BACKEND').toLowerCase();
  const host = pickFirstEnv('MYSQL_HOST', 'DB_HOST', 'CPANEL_DB_HOST');
  const user = pickFirstEnv('MYSQL_USER', 'DB_USER', 'CPANEL_DB_USER');
  const password = pickFirstEnv('MYSQL_PASSWORD', 'DB_PASSWORD', 'CPANEL_DB_PASSWORD');
  const database = pickFirstEnv('MYSQL_DATABASE', 'DB_NAME', 'CPANEL_DB_NAME');
  const port = Number.parseInt(pickFirstEnv('MYSQL_PORT', 'DB_PORT', 'CPANEL_DB_PORT') || '3306', 10) || 3306;
  const tablePrefix = toSafeIdentifier(pickFirstEnv('MYSQL_TABLE_PREFIX', 'DB_TABLE_PREFIX', 'CPANEL_DB_TABLE_PREFIX'), 'app_table');
  const usersTable = toSafeIdentifier(pickFirstEnv('MYSQL_USERS_TABLE', 'DB_USERS_TABLE', 'CPANEL_DB_USERS_TABLE'), 'app_users');

  const requestedMysql = backend === 'mysql';
  const hasMysqlEnv = Boolean(host && user && database);
  return {
    enabled: requestedMysql || hasMysqlEnv,
    host,
    user,
    password,
    database,
    port,
    tablePrefix,
    usersTable
  };
};

const escapeIdentifier = (identifier) => {
  if (!/^[a-z0-9_]+$/i.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
};

const migrateMysqlTables = async (config) => {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 3
  });

  const summary = [];

  for (const tableName of TABLES) {
    const sqlTable = `${config.tablePrefix}_${toSafeIdentifier(tableName, tableName)}`;
    const tableIdentifier = escapeIdentifier(sqlTable);
    let rows;

    try {
      const [resultRows] = await pool.query(`SELECT pk, row_json FROM ${tableIdentifier} ORDER BY pk ASC`);
      rows = Array.isArray(resultRows) ? resultRows : [];
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ER_NO_SUCH_TABLE') {
        summary.push({ tableName, totalRows: 0, changedRows: 0, skipped: true });
        continue;
      }
      throw error;
    }

    let changedRows = 0;
    for (const row of rows) {
      let parsed;
      try {
        parsed = JSON.parse(String(row.row_json || '{}'));
      } catch {
        continue;
      }
      const transformed = await transformValue(parsed, tableName);
      if (!transformed.changed) continue;

      await pool.query(
        `UPDATE ${tableIdentifier} SET row_json = ? WHERE pk = ?`,
        [JSON.stringify(transformed.value), row.pk]
      );
      changedRows += 1;
    }

    summary.push({ tableName, totalRows: rows.length, changedRows });
  }

  const usersTableIdentifier = escapeIdentifier(config.usersTable);
  try {
    const [usersRows] = await pool.query(
      `SELECT id, photo_url, user_json FROM ${usersTableIdentifier} ORDER BY id ASC`
    );
    let changedUsers = 0;

    for (const row of usersRows) {
      let changed = false;
      let nextPhotoUrl = row.photo_url;
      let nextUserJson = row.user_json;

      const photoResult = await transformValue(row.photo_url, 'users/photo_url');
      if (photoResult.changed) {
        nextPhotoUrl = photoResult.value;
        changed = true;
      }

      try {
        const parsedUserJson = JSON.parse(String(row.user_json || '{}'));
        const userJsonResult = await transformValue(parsedUserJson, 'users/user_json');
        if (userJsonResult.changed) {
          nextUserJson = JSON.stringify(userJsonResult.value);
          changed = true;
        }
      } catch {
        // skip invalid user_json parse
      }

      if (!changed) continue;

      await pool.query(
        `UPDATE ${usersTableIdentifier} SET photo_url = ?, user_json = ? WHERE id = ?`,
        [nextPhotoUrl, nextUserJson, row.id]
      );
      changedUsers += 1;
    }

    summary.push({
      tableName: config.usersTable,
      totalRows: usersRows.length,
      changedRows: changedUsers
    });
  } catch (error) {
    if (!(error && typeof error === 'object' && error.code === 'ER_NO_SUCH_TABLE')) {
      throw error;
    }
    summary.push({
      tableName: config.usersTable,
      totalRows: 0,
      changedRows: 0,
      skipped: true
    });
  }

  await pool.end();
  return summary;
};

const run = async () => {
  console.log('[img:migrate] scanning JSON table files...');
  let jsonChangedRows = 0;

  for (const tableName of TABLES) {
    const result = await migrateJsonTableFile(tableName);
    jsonChangedRows += result.changedRows;
    console.log(`[img:migrate] json ${tableName}: ${result.changedRows}/${result.totalRows} row(s) changed`);
  }

  const usersFile = await migrateJsonUsersFile();
  console.log(`[img:migrate] json users: ${usersFile.changedUsers}/${usersFile.totalUsers} user(s) changed`);

  const config = mysqlConfig();
  let mysqlChangedRows = 0;
  if (config.enabled) {
    console.log('[img:migrate] scanning MySQL table rows...');
    const mysqlResults = await migrateMysqlTables(config);
    for (const entry of mysqlResults) {
      const skippedLabel = entry.skipped ? ' (missing table)' : '';
      console.log(
        `[img:migrate] mysql ${entry.tableName}: ${entry.changedRows}/${entry.totalRows} row(s) changed${skippedLabel}`
      );
      mysqlChangedRows += entry.changedRows;
    }
  } else {
    console.log('[img:migrate] MySQL env not configured; skipped mysql migration.');
  }

  console.log(`[img:migrate] saved files: ${savedFiles}`);
  console.log(`[img:migrate] total changed rows: json=${jsonChangedRows + usersFile.changedUsers}, mysql=${mysqlChangedRows}`);
};

run().catch((error) => {
  console.error('[img:migrate] failed:', error);
  process.exitCode = 1;
});
