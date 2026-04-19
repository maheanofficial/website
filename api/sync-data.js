import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { json } from './_request-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Triggers database synchronization from JSON to MySQL.
 * Protected by a secret key.
 */
export default async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = url.searchParams.get('key');
    // Default to a fallback if not set in environment
    const secret = process.env.DEPLOY_SYNC_SECRET || 'sync_default_secret_9988';

    if (!key || key !== secret) {
        console.warn('[sync-api] Unauthorized attempt with key:', key);
        return json(res, { error: 'Unauthorized' }, 401);
    }

    const scriptPath = path.resolve(__dirname, '..', 'scripts', 'migrate-json-to-mysql.cjs');
    
    console.log('[sync-api] Starting database migration...');
    
    return new Promise((resolve) => {
        exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[sync-api] Migration failed: ${error.message}`);
                json(res, { 
                    error: 'Migration failed', 
                    details: error.message,
                    stderr 
                }, 500);
            } else {
                console.log('[sync-api] Migration successful');
                json(res, { 
                    message: 'Database synchronization complete', 
                    stdout 
                });
            }
            resolve();
        });
    });
}
