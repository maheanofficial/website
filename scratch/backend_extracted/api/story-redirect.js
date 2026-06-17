const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

export default async function handler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Method Not Allowed');
        return;
    }

    const baseUrl = `http://${req.headers?.host || 'localhost'}`;
    const url = new URL(req.url || '', baseUrl);
    const id = url.searchParams.get('id')?.trim() || '';
    const partParam = url.searchParams.get('part');
    const partNumber = parsePositiveInt(partParam, 1);

    if (!id) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Missing id.');
        return;
    }

    // In local mode we do not query a remote DB for slug lookup.
    // We keep legacy numeric links working by redirecting to id-based path.
    const location = `/stories/${encodeURIComponent(id)}/part/${partNumber}`;
    res.statusCode = 301;
    res.setHeader('Location', location);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end();
}
