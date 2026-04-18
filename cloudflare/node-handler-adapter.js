import { runWithRuntimeContext } from '../api/_runtime-context.js';

const toHeaderRecord = (headers) => {
    const out = {};
    headers.forEach((value, key) => {
        out[String(key || '').toLowerCase()] = String(value || '');
    });
    return out;
};

const normalizeStatusCode = (value) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 599) {
        return 200;
    }
    return parsed;
};

const toResponseBodyChunk = (value) => {
    if (value === undefined || value === null) {
        return Buffer.alloc(0);
    }
    if (Buffer.isBuffer(value)) {
        return value;
    }
    if (value instanceof Uint8Array) {
        return Buffer.from(value);
    }
    return Buffer.from(String(value), 'utf8');
};

const createNodeLikeRequest = (request, env, rewrittenUrl) => {
    const url = new URL(request.url);
    const normalizedUrl = rewrittenUrl || `${url.pathname}${url.search}`;
    const headers = toHeaderRecord(request.headers);
    const bodyPromise = (request.method === 'GET' || request.method === 'HEAD')
        ? Promise.resolve(Buffer.alloc(0))
        : request.arrayBuffer().then((value) => Buffer.from(value));

    let consumed = false;

    return {
        method: request.method,
        url: normalizedUrl,
        headers,
        socket: {
            encrypted: url.protocol === 'https:',
            remoteAddress: headers['cf-connecting-ip'] || ''
        },
        cfEnv: env,
        async *[Symbol.asyncIterator]() {
            if (consumed) {
                return;
            }
            consumed = true;
            const body = await bodyPromise;
            if (body.length > 0) {
                yield body;
            }
        }
    };
};

const createNodeLikeResponse = (request) => {
    let statusCode = 200;
    let ended = false;
    let headersSent = false;
    const headers = new Map();
    const bodyChunks = [];

    const setHeader = (key, value) => {
        headers.set(String(key || '').toLowerCase(), value);
    };

    const appendBody = (value) => {
        if (value === undefined || value === null) {
            return;
        }
        bodyChunks.push(toResponseBodyChunk(value));
    };

    return {
        get statusCode() {
            return statusCode;
        },
        set statusCode(value) {
            statusCode = normalizeStatusCode(value);
        },
        get headersSent() {
            return headersSent;
        },
        setHeader,
        getHeader(key) {
            return headers.get(String(key || '').toLowerCase());
        },
        hasHeader(key) {
            return headers.has(String(key || '').toLowerCase());
        },
        write(value) {
            if (ended) return;
            headersSent = true;
            appendBody(value);
        },
        end(value) {
            if (ended) return;
            headersSent = true;
            ended = true;
            appendBody(value);
        },
        destroy() {
            ended = true;
        },
        toFetchResponse() {
            const fetchHeaders = new Headers();
            for (const [key, value] of headers.entries()) {
                if (Array.isArray(value)) {
                    value.forEach((entry) => {
                        fetchHeaders.append(key, String(entry));
                    });
                    continue;
                }
                if (value !== undefined && value !== null) {
                    fetchHeaders.set(key, String(value));
                }
            }

            const method = String(request.method || 'GET').toUpperCase();
            const bodyBuffer = bodyChunks.length ? Buffer.concat(bodyChunks) : Buffer.alloc(0);
            const body = method === 'HEAD' ? null : (bodyBuffer.length ? bodyBuffer : null);

            return new Response(body, {
                status: normalizeStatusCode(statusCode),
                headers: fetchHeaders
            });
        }
    };
};

export const runNodeHandler = async ({
    request,
    env,
    handler,
    rewrittenUrl
}) => {
    const req = createNodeLikeRequest(request, env, rewrittenUrl);
    const res = createNodeLikeResponse(request);

    try {
        await runWithRuntimeContext({ env, request }, async () => {
            await handler(req, res);
        });
    } catch (error) {
        console.error('Node-style handler failed:', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain; charset=utf-8');
            res.end('Internal Server Error');
        }
    }

    return res.toFetchResponse();
};
