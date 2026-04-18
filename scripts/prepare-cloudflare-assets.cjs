const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const removableFiles = [
    path.join(projectRoot, 'dist', '_redirects'),
    path.join(projectRoot, 'dist', 'sitemap.xml')
];

for (const targetPath of removableFiles) {
    const relativePath = path.relative(projectRoot, targetPath).replace(/\\/g, '/');
    try {
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            console.log(`[cloudflare] Removed ${relativePath} for Worker-first handling.`);
        }
    } catch (error) {
        console.warn(`[cloudflare] Failed to clean ${relativePath}:`, error?.message || error);
    }
}

