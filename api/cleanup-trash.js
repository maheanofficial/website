const pickFirstEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const CRON_SECRET = pickFirstEnv('CRON_SECRET');

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

    json(res, 200, {
        success: true,
        deletedCount: 0,
        message: 'Local mode enabled. Remote trash cleanup skipped.'
    });
}
