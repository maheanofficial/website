#!/usr/bin/env node
'use strict';

const FTP = require('ftp');
const fs = require('fs');
const path = require('path');

const HOST = '122.165.242.4';
const USER = 'mahean';
const PASSWORD = 'k4a9W6]8Xsb;EH';
const REMOTE_BASE = '/mahean_node_app/dist';
const LOCAL_DIST = path.join(__dirname, 'dist');

const client = new FTP();

function upload(localPath, remotePath) {
    return new Promise((resolve, reject) => {
        client.put(localPath, remotePath, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function mkdir(remotePath) {
    return new Promise((resolve) => {
        client.mkdir(remotePath, true, () => resolve());
    });
}

function uploadDir(localDir, remoteDir) {
    return new Promise(async (resolve, reject) => {
        try {
            await mkdir(remoteDir);
            const entries = fs.readdirSync(localDir, { withFileTypes: true });
            for (const entry of entries) {
                const localFull = path.join(localDir, entry.name);
                const remoteFull = `${remoteDir}/${entry.name}`;
                if (entry.isDirectory()) {
                    await uploadDir(localFull, remoteFull);
                } else {
                    try {
                        await upload(localFull, remoteFull);
                        process.stdout.write('.');
                    } catch (e) {
                        process.stdout.write('x');
                    }
                }
            }
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

async function run() {
    // Upload key files
    const rootFiles = [
        'index.html',
        'server.js',
        'package.json',
        'sitemap.xml',
        'ads.txt',
        'rss.xml',
        'robots.txt',
    ];

    console.log('Connecting to FTP...');
    await new Promise((resolve, reject) => {
        client.on('ready', resolve);
        client.on('error', reject);
        client.connect({ host: HOST, user: USER, password: PASSWORD });
    });

    console.log('Connected. Uploading...');

    // Upload root dist files
    for (const f of rootFiles) {
        const local = path.join(LOCAL_DIST, f);
        if (fs.existsSync(local)) {
            try {
                await upload(local, `${REMOTE_BASE}/${f}`);
                console.log(`  ✓ ${f}`);
            } catch (e) {
                console.log(`  ✗ ${f}: ${e.message}`);
            }
        }
    }

    // Upload assets directory
    console.log('Uploading assets...');
    const assetsDir = path.join(LOCAL_DIST, 'assets');
    if (fs.existsSync(assetsDir)) {
        await uploadDir(assetsDir, `${REMOTE_BASE}/assets`);
        console.log('\n  ✓ assets');
    }

    // Upload non-story static pages
    const staticPages = ['about', 'contact', 'series', 'authors', 'categories', 'tags', 'links', 'privacy', 'terms', 'disclaimer'];
    for (const page of staticPages) {
        const local = path.join(LOCAL_DIST, page, 'index.html');
        if (fs.existsSync(local)) {
            try {
                await mkdir(`${REMOTE_BASE}/${page}`);
                await upload(local, `${REMOTE_BASE}/${page}/index.html`);
                console.log(`  ✓ /${page}`);
            } catch (e) {
                console.log(`  ✗ /${page}: ${e.message}`);
            }
        }
    }

    // Restart app
    console.log('Restarting app...');
    const tmpContent = Buffer.from('');
    await new Promise((resolve) => {
        client.put(tmpContent, `/mahean_node_app/tmp/restart.txt`, () => resolve());
    });
    console.log('  ✓ restart.txt uploaded');

    client.end();
    console.log('\nDeploy complete!');
}

run().catch((e) => {
    console.error('Deploy failed:', e);
    client.end();
    process.exit(1);
});
