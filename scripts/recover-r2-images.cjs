#!/usr/bin/env node
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = '56cf6fdbc6fa2d30b97eea52e6da1c28';
const BUCKET = 'mahean-uploads-prod';
const TOKEN = '5n1WiksUiA43DmwU1UHX37ddVZsXVQgRt8HzF1H3BvQ.xVdFGOTGCxc9M7Ag9jEgIS6ifhab4_BFhvOnIbgvbeE';
const OUT_DIR = path.join(__dirname, '..', 'public', 'uploads');

function cfGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.request({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}` }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function listAllObjects() {
  const all = [];
  let cursor = null;
  let page = 0;
  while (true) {
    page++;
    let url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects?limit=1000`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    const res = await cfGet(url);
    const data = JSON.parse(res.body.toString());
    if (!data.success) { console.error('List error:', data.errors); break; }
    all.push(...(data.result || []));
    console.log(`Page ${page}: got ${data.result?.length} objects (total so far: ${all.length})`);
    if (!data.result_info?.is_truncated) break;
    cursor = data.result_info.cursor;
  }
  return all;
}

async function downloadObject(key, destPath) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;
  const res = await cfGet(url);
  if (res.status !== 200) {
    console.error(`  FAIL ${key} (HTTP ${res.status})`);
    return false;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, res.body);
  return true;
}

async function main() {
  console.log('Listing all R2 objects...');
  const objects = await listAllObjects();
  console.log(`\nTotal objects in R2: ${objects.length}`);

  // Filter only uploads/ keys (images)
  const imageKeys = objects
    .map(o => o.key)
    .filter(k => k.startsWith('uploads/') && /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(k));

  console.log(`\nImage files to download: ${imageKeys.length}`);

  let ok = 0, fail = 0;
  for (const key of imageKeys) {
    // key = "uploads/stories/covers/2026/03/abc.png"
    // destPath = public/uploads/stories/covers/2026/03/abc.png
    const destPath = path.join(OUT_DIR, key.replace(/^uploads\//, ''));
    if (fs.existsSync(destPath)) {
      console.log(`  SKIP (exists): ${key}`);
      ok++;
      continue;
    }
    process.stdout.write(`  Downloading: ${key} ... `);
    const success = await downloadObject(key, destPath);
    if (success) {
      const size = fs.statSync(destPath).size;
      console.log(`OK (${Math.round(size/1024)}KB)`);
      ok++;
    } else {
      fail++;
    }
  }

  console.log(`\nDone! Downloaded: ${ok}, Failed: ${fail}`);
  console.log(`\nImages saved to: ${OUT_DIR}`);

  // Show summary by folder
  const folders = {};
  for (const k of imageKeys) {
    const parts = k.split('/');
    const folder = parts.slice(0, 4).join('/');
    folders[folder] = (folders[folder] || 0) + 1;
  }
  console.log('\nBy folder:');
  Object.entries(folders).sort().forEach(([f, n]) => console.log(`  ${f}: ${n} files`));
}

main().catch(console.error);
