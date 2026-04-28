// Centralized cache-busting helper for uploaded images.
// Bump THUMBNAIL_CACHE_BUST_VERSION whenever you regenerate thumbnails (or any
// /uploads/* asset) so browsers refetch instead of serving the stale cached PNG
// at the same URL.
//
// Convention: YYYYMMDD-<short-tag>
// Example bumps:
//   20260401-1          -> initial cache-bust scheme
//   20260428-lisubha    -> Li Subha Letterpress Unicode font regeneration
//   20260428-powerful   -> Powered-up thumbnail design (gradient bg, ornaments)

export const THUMBNAIL_CACHE_BUST_VERSION = '20260428-powerful';

/**
 * Append `?tbv=<version>` to URLs that point at locally-served uploads
 * (`/uploads/...`). External URLs (https, data:, etc.) are returned as-is.
 * Idempotent: if the param is already present, the URL is returned unchanged.
 */
export const withCacheBust = (url?: string | null): string => {
    const value = String(url || '').trim();
    if (!value) return value;
    if (!value.includes('/uploads/')) return value;
    if (/[?&]tbv=/.test(value)) return value;
    return value + (value.includes('?') ? '&' : '?') + 'tbv=' + THUMBNAIL_CACHE_BUST_VERSION;
};
