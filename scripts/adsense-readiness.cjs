const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ADSENSE_SELLER_ID = 'f08c47fec0942fa0';

const requiredLegalRoutes = [
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/disclaimer'
];

const ok = (message) => console.log(`PASS  ${message}`);
const fail = (message) => console.log(`FAIL  ${message}`);
const warn = (message) => console.log(`WARN  ${message}`);

const readIfExists = async (filePath) => {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return '';
        }
        throw error;
    }
};

const pathForRoute = (route) => {
    if (route === '/') return path.join(DIST_DIR, 'index.html');
    return path.join(DIST_DIR, route.replace(/^\/+/, ''), 'index.html');
};

const run = async () => {
    let hasFailures = false;

    const indexPath = path.join(DIST_DIR, 'index.html');
    const indexHtml = await readIfExists(indexPath);
    if (!indexHtml) {
        fail('dist/index.html not found. Run `npm run build` first.');
        process.exitCode = 1;
        return;
    }

    const accountMetaMatch = indexHtml.match(
        /<meta\s+name=["']google-adsense-account["']\s+content=["'](ca-pub-\d{6,})["'][^>]*>/i
    );
    if (accountMetaMatch) {
        ok(`AdSense account meta found (${accountMetaMatch[1]}).`);
    } else {
        fail('AdSense account meta not found with a valid ca-pub id in dist/index.html.');
        hasFailures = true;
    }

    const scriptMatch = indexHtml.match(
        /https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=(ca-pub-\d{6,})/i
    );
    if (scriptMatch) {
        ok('AdSense script tag found with a valid client id.');
    } else {
        fail('AdSense script tag is missing or does not include a valid client id.');
        hasFailures = true;
    }

    const adsTxtPath = path.join(DIST_DIR, 'ads.txt');
    const adsTxt = await readIfExists(adsTxtPath);
    const adsTxtMatch = adsTxt.match(
        new RegExp(`^google\\.com,\\s*pub-\\d{6,},\\s*DIRECT,\\s*${ADSENSE_SELLER_ID}$`, 'im')
    );
    if (adsTxtMatch) {
        ok('ads.txt contains a valid AdSense record.');
    } else {
        fail('ads.txt does not contain a valid AdSense record (google.com, pub-..., DIRECT, f08c47fec0942fa0).');
        hasFailures = true;
    }

    for (const route of requiredLegalRoutes) {
        const html = await readIfExists(pathForRoute(route));
        if (html) {
            ok(`Legal page exists: ${route}`);
        } else {
            fail(`Missing legal page output: ${route}`);
            hasFailures = true;
        }
    }

    const robotsTxt = await readIfExists(path.join(DIST_DIR, 'robots.txt'));
    if (!robotsTxt) {
        warn('dist/robots.txt not found.');
    } else {
        if (/User-agent:\s*\*\s*[\s\S]*?Disallow:\s*\/\s*$/im.test(robotsTxt)) {
            fail('robots.txt blocks all crawlers (Disallow: /).');
            hasFailures = true;
        } else {
            ok('robots.txt does not block all crawlers.');
        }

        if (/User-agent:\s*Mediapartners-Google[\s\S]*?Disallow:\s*\/\s*$/im.test(robotsTxt)) {
            fail('robots.txt blocks Mediapartners-Google.');
            hasFailures = true;
        } else {
            ok('robots.txt does not block Mediapartners-Google.');
        }
    }

    if (hasFailures) {
        console.error('\nAdSense readiness check failed.');
        process.exitCode = 1;
        return;
    }

    console.log('\nAdSense readiness check passed.');
};

run().catch((error) => {
    console.error('Failed to run AdSense readiness check:', error);
    process.exitCode = 1;
});
