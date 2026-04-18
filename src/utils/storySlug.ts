import { slugify } from './slugify';

const LEGACY_STORY_SLUG_SUFFIX_REGEX = /-\d{5}$/;

const toAlphabeticSuffix = (index: number) => {
    let cursor = Math.max(1, Math.floor(index));
    let output = '';

    while (cursor > 0) {
        cursor -= 1;
        output = String.fromCharCode(97 + (cursor % 26)) + output;
        cursor = Math.floor(cursor / 26);
    }

    return output;
};

export const stripLegacyStorySlugSuffix = (value: string) => {
    const normalized = slugify(String(value || ''));
    if (!normalized) return '';

    const stripped = normalized.replace(LEGACY_STORY_SLUG_SUFFIX_REGEX, '');
    return stripped || normalized;
};

export const resolveUniqueStorySlug = (baseValue: string, takenValues: Iterable<string>) => {
    const normalizedBase = stripLegacyStorySlugSuffix(baseValue);
    if (!normalizedBase) return '';

    const taken = new Set(
        Array.from(takenValues)
            .map((value) => stripLegacyStorySlugSuffix(String(value || '')))
            .filter(Boolean)
    );

    if (!taken.has(normalizedBase)) {
        return normalizedBase;
    }

    for (let attempt = 1; attempt <= 18278; attempt += 1) {
        const candidate = `${normalizedBase}-${toAlphabeticSuffix(attempt)}`;
        if (!taken.has(candidate)) {
            return candidate;
        }
    }

    const fallback = `${normalizedBase}-variant`;
    if (!taken.has(fallback)) return fallback;

    let suffixCursor = 1;
    while (suffixCursor <= 18278) {
        const candidate = `${fallback}-${toAlphabeticSuffix(suffixCursor)}`;
        if (!taken.has(candidate)) return candidate;
        suffixCursor += 1;
    }

    return fallback;
};
