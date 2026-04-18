const AUTH_ROUTE_PREFIXES = ['/login', '/signup', '/admin/login', '/admin/signup', '/forgot-password', '/update-password'];
const AUTH_REDIRECT_STORAGE_KEY = 'mahean_auth_redirect_next';

export const sanitizeAuthNextPath = (value?: string, fallback = '/stories') => {
    const raw = String(value || '').trim();
    if (!raw) {
        return fallback;
    }

    if (!raw.startsWith('/') || raw.startsWith('//')) {
        return fallback;
    }

    if (AUTH_ROUTE_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
        return fallback;
    }

    return raw;
};

export const readAuthNextPath = (search: string, fallback = '/stories') => {
    const params = new URLSearchParams(search);
    return sanitizeAuthNextPath(params.get('next') || undefined, fallback);
};

export const buildAuthPageLink = (pathname: string, nextPath?: string, fallback = '/stories') => {
    const safeNext = sanitizeAuthNextPath(nextPath, fallback);
    return `${pathname}?next=${encodeURIComponent(safeNext)}`;
};

export const storeAuthRedirectIntent = (nextPath?: string, fallback = '/stories') => {
    if (typeof window === 'undefined') return;
    const safeNext = sanitizeAuthNextPath(nextPath, fallback);
    try {
        localStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, safeNext);
    } catch {
        // Ignore storage failures.
    }
};

export const readStoredAuthRedirectIntent = (fallback = '/stories') => {
    if (typeof window === 'undefined') return '';
    try {
        return sanitizeAuthNextPath(localStorage.getItem(AUTH_REDIRECT_STORAGE_KEY) || undefined, fallback);
    } catch {
        return '';
    }
};

export const clearStoredAuthRedirectIntent = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
    } catch {
        // Ignore storage failures.
    }
};

export const consumeStoredAuthRedirectIntent = (fallback = '/stories') => {
    const value = readStoredAuthRedirectIntent(fallback);
    clearStoredAuthRedirectIntent();
    return value;
};
