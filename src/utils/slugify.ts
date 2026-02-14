const normalizeUnicode = (value: string) => {
    try {
        return value.normalize('NFKC');
    } catch {
        return value;
    }
};

// Generates URL-safe slugs while keeping non-Latin letters (e.g. Bangla) intact.
// Falls back to ASCII-only behavior if Unicode property escapes aren't supported.
export const slugify = (value: string) => {
    const base = normalizeUnicode(String(value ?? ''))
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    let cleaned = base;
    try {
        // Keep letters/numbers from any language + hyphen.
        cleaned = cleaned.replace(/[^\p{L}\p{N}-]+/gu, '');
    } catch {
        // Fallback for older JS engines.
        cleaned = cleaned.replace(/[^\w-]+/g, '');
    }

    return cleaned
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

