const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TABLE_PREFIX = 'table-';

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

const usage = () => {
  console.log('Usage: node scripts/import-supabase-json.cjs <export-dir>');
  console.log('Accepted source files per table:');
  console.log('  <table>.json OR table-<table>.json');
  process.exitCode = 1;
};

const toRows = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) {
    return parsed.rows;
  }
  return [];
};

const stripBom = (raw) => raw.replace(/^\uFEFF/, '');

const MOJIBAKE_PATTERN = /(?:à¦|à§|Ã|Â|â€|â€™|â€œ|â€�)/;

const scoreMojibake = (value) => (String(value).match(/(?:à¦|à§|Ã|Â|â€|â€™|â€œ|â€�|�)/g) || []).length;

const scoreBangla = (value) => (String(value).match(/[\u0980-\u09FF]/g) || []).length;

const decodeLatin1AsUtf8 = (value) => {
  try {
    return Buffer.from(String(value), 'latin1').toString('utf8');
  } catch {
    return String(value);
  }
};

const repairMojibakeText = (value) => {
  const input = String(value ?? '');
  if (!input || !MOJIBAKE_PATTERN.test(input)) return input;

  let current = input;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const decoded = decodeLatin1AsUtf8(current);
    if (!decoded || decoded === current) break;

    const improvedBangla = scoreBangla(decoded) > scoreBangla(current);
    const reducedNoise = scoreMojibake(decoded) < scoreMojibake(current);
    if (!improvedBangla && !reducedNoise) break;

    current = decoded;
  }

  return current;
};

const repairDeep = (value) => {
  if (typeof value === 'string') return repairMojibakeText(value);
  if (Array.isArray(value)) return value.map(repairDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, repairDeep(entry)])
    );
  }
  return value;
};

const readTableExport = async (exportDir, table) => {
  const candidates = [
    path.join(exportDir, `${table}.json`),
    path.join(exportDir, `${TABLE_PREFIX}${table}.json`)
  ];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(stripBom(raw));
      return { rows: repairDeep(toRows(parsed)), source: candidate };
    } catch (error) {
      if (!(error && typeof error === 'object' && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  return { rows: [], source: null };
};

const run = async () => {
  const exportDirArg = process.argv[2];
  if (!exportDirArg) {
    usage();
    return;
  }

  const exportDir = path.resolve(process.cwd(), exportDirArg);
  await fs.mkdir(DATA_DIR, { recursive: true });

  let importedTables = 0;
  let importedRows = 0;

  for (const table of TABLES) {
    const { rows, source } = await readTableExport(exportDir, table);
    const target = path.join(DATA_DIR, `${TABLE_PREFIX}${table}.json`);
    await fs.writeFile(target, JSON.stringify({ rows }, null, 2), 'utf8');

    importedTables += 1;
    importedRows += rows.length;
    console.log(
      `[db:import] ${table}: ${rows.length} rows${source ? ` <- ${source}` : ' (no source file, initialized empty)'}`
    );
  }

  console.log(`[db:import] done. tables: ${importedTables}, rows: ${importedRows}`);
};

run().catch((error) => {
  console.error('[db:import] failed:', error);
  process.exitCode = 1;
});
