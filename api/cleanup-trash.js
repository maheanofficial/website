import { createClient } from '@supabase/supabase-js';

const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const SUPABASE_URL = pickFirstEnv(
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL'
) || 'https://gepywlhveafqosoyitcb.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY = pickFirstEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_ADMIN_KEY',
    'SERVICE_ROLE_KEY'
);

const CRON_SECRET = pickFirstEnv('CRON_SECRET');
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const TRASH_TABLE = 'trash';
const ACTIVITY_TABLE = 'activity_logs';

const json = (res, statusCode, payload) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(payload));
};

const isAuthorized = (req) => {
    if (!CRON_SECRET) return true;
    const header = typeof req.headers?.authorization === 'string'
        ? req.headers.authorization.trim()
        : '';
    return header === `Bearer ${CRON_SECRET}`;
};

export default async function handler(req, res) {
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    if (!isAuthorized(req)) {
        json(res, 401, { error: 'Unauthorized.' });
        return;
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        json(res, 500, { error: 'Missing Supabase server credentials.' });
        return;
    }

    const cutoffIso = new Date(Date.now() - RETENTION_MS).toISOString();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });

    try {
        const { data, error } = await supabase
            .from(TRASH_TABLE)
            .delete()
            .lt('deleted_at', cutoffIso)
            .select('id');

        if (error) throw error;

        const deletedCount = data?.length ?? 0;

        if (deletedCount > 0) {
            await supabase
                .from(ACTIVITY_TABLE)
                .insert({
                    id: `${Date.now()}-cron-trash-cleanup`,
                    action: 'empty_trash',
                    target_type: 'system',
                    description: `Auto-cleaned ${deletedCount} trash item(s) older than ${RETENTION_DAYS} days`,
                    user_name: 'System Cron',
                    timestamp: new Date().toISOString()
                });
        }

        json(res, 200, {
            success: true,
            retentionDays: RETENTION_DAYS,
            cutoffIso,
            deletedCount
        });
    } catch (error) {
        json(res, 500, {
            success: false,
            error: error instanceof Error ? error.message : 'Trash cleanup failed.'
        });
    }
}
