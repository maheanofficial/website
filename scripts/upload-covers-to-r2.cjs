const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUCKET_NAME = 'mahean-uploads-prod';

// Helper to convert long path to short 8.3 path on Windows
const toShortPath = (longPath) => {
  if (process.platform !== 'win32') return longPath;
  try {
    const stdout = execSync(`powershell -Command "if (Test-Path '${longPath}') { (New-Object -ComObject Scripting.FileSystemObject).GetFolder('${longPath}').ShortPath } else { '${longPath}' }"`, { encoding: 'utf8' });
    const short = stdout.trim();
    return short || longPath;
  } catch (err) {
    return longPath;
  }
};

let PUBLIC_DIR = path.join(__dirname, '..', 'public');
// Convert to short path so it contains no spaces
PUBLIC_DIR = toShortPath(PUBLIC_DIR);

const COVERS_DIR = path.join(PUBLIC_DIR, 'uploads', 'stories', 'covers');

// Recursively find all files in a directory
const getFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  if (!fs.existsSync(COVERS_DIR)) {
    console.error('Covers directory does not exist:', COVERS_DIR);
    process.exit(1);
  }

  console.log('Using Space-Free Public Directory:', PUBLIC_DIR);
  console.log('Scanning covers in:', COVERS_DIR);
  
  const files = getFiles(COVERS_DIR).filter((f) => f.endsWith('.png'));
  console.log(`Found ${files.length} cover image(s) to upload.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const filePath = files[idx];
    // Get key relative to the public directory
    const relativePath = path.relative(PUBLIC_DIR, filePath);
    // Replace backslashes with forward slashes for R2 key
    const r2Key = relativePath.replace(/\\/g, '/');

    console.log(`[${idx + 1}/${files.length}] Uploading to R2: ${r2Key}...`);
    console.log(`Local path: ${filePath}`);

    try {
      // Execute wrangler put command with no internal quotes since paths are space-free short-paths, and add --remote
      const cmd = `cmd /c "npx wrangler r2 object put mahean-uploads-prod/${r2Key} --file ${filePath} --content-type image/png --remote"`;
      execSync(cmd, { stdio: 'inherit' });
      console.log(`Successfully uploaded: ${r2Key}\n`);
      successCount++;
    } catch (error) {
      console.error(`Failed to upload ${r2Key}:`, error.message);
      failCount++;
    }

    // Add a 500ms delay to prevent libuv process handle crashes
    await delay(500);
  }

  console.log(`Upload complete. Success: ${successCount}, Failed: ${failCount}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
