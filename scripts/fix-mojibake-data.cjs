const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TABLE_FILE_PATTERN = /^table-[a-z0-9_-]+\.json$/i;
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

const repairDeepWithCount = (value) => {
  if (typeof value === 'string') {
    const repaired = repairMojibakeText(value);
    return { value: repaired, changed: repaired === value ? 0 : 1 };
  }

  if (Array.isArray(value)) {
    let changed = 0;
    const next = value.map((entry) => {
      const result = repairDeepWithCount(entry);
      changed += result.changed;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === 'object') {
    let changed = 0;
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      const result = repairDeepWithCount(entry);
      changed += result.changed;
      next[key] = result.value;
    }
    return { value: next, changed };
  }

  return { value, changed: 0 };
};

const main = async () => {
  let files;
  try {
    files = await fs.readdir(DATA_DIR);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      console.log('[db:fix-encoding] data directory not found, nothing to do.');
      return;
    }
    throw error;
  }

  const targets = files
    .filter((file) => TABLE_FILE_PATTERN.test(file))
    .sort((a, b) => a.localeCompare(b));

  if (!targets.length) {
    console.log('[db:fix-encoding] no table files found.');
    return;
  }

  let changedFiles = 0;
  let changedStrings = 0;

  for (const fileName of targets) {
    const filePath = path.join(DATA_DIR, fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const repaired = repairDeepWithCount(parsed);

    if (repaired.changed > 0) {
      await fs.writeFile(filePath, JSON.stringify(repaired.value, null, 2), 'utf8');
      changedFiles += 1;
      changedStrings += repaired.changed;
      console.log(`[db:fix-encoding] updated ${fileName}: ${repaired.changed} string(s) repaired`);
    } else {
      console.log(`[db:fix-encoding] ok ${fileName}`);
    }
  }

  console.log(
    `[db:fix-encoding] done. files changed: ${changedFiles}/${targets.length}, strings repaired: ${changedStrings}`
  );
};

main().catch((error) => {
  console.error('[db:fix-encoding] failed:', error);
  process.exitCode = 1;
});
