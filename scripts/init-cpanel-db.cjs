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
      // If existing file is malformed, rewrite to a safe shape.
    }
    await fs.writeFile(filePath, JSON.stringify(fallbackPayload, null, 2), 'utf8');
    return { path: filePath, action: 'created' };
  }
};

const run = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const results = [];
  for (const table of TABLES) {
    const filePath = path.join(DATA_DIR, `${TABLE_FILE_PREFIX}${table}.json`);
    const result = await ensureJsonFile(filePath, { rows: [] });
    results.push(result);
  }

  // Keep users store ready as well (auth layer expects users.json).
  const usersPath = path.join(DATA_DIR, 'users.json');
  const usersResult = await ensureJsonFile(usersPath, { users: [] });

  const created = [...results, usersResult].filter((entry) => entry.action === 'created');
  const existing = [...results, usersResult].filter((entry) => entry.action === 'exists');

  console.log(`[db:init] table files ready: ${results.length}`);
  console.log(`[db:init] users store: ${usersResult.action}`);
  console.log(`[db:init] created: ${created.length}, existing: ${existing.length}`);
};

run().catch((error) => {
  console.error('[db:init] failed:', error);
  process.exitCode = 1;
});
