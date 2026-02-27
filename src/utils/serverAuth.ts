const SERVER_SESSION_KEY = 'mahean_server_auth_session';

type SessionLike = {
    access_token?: unknown;
    expires_at?: unknown;
};

export const readServerAccessToken = (): string => {
    if (typeof window === 'undefined') return '';

    try {
        const raw = localStorage.getItem(SERVER_SESSION_KEY);
        if (!raw) return '';
        const parsed = JSON.parse(raw) as SessionLike;
        const expiresAt = Number(parsed?.expires_at);
        const nowSec = Math.floor(Date.now() / 1000);
        if (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= nowSec) {
            localStorage.removeItem(SERVER_SESSION_KEY);
            return '';
        }
        return typeof parsed?.access_token === 'string' ? parsed.access_token : '';
    } catch {
        return '';
    }
};

export const buildServerAuthHeaders = (headers: Record<string, string> = {}) => {
    const token = readServerAccessToken();
    if (!token) return headers;
    return {
        ...headers,
        Authorization: `Bearer ${token}`
    };
};
