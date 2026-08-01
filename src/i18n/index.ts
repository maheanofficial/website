import bn from './bn.json';
import en from './en.json';

type Translations = typeof bn;
type Language = 'bn' | 'en';

const translations: Record<Language, Translations> = { bn, en };

const STORAGE_KEY = 'mahean_language';
const DEFAULT_LANGUAGE: Language = 'bn';

export const getLanguage = (): Language => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'bn' || stored === 'en') return stored;
    } catch { /* ignore */ }
    return DEFAULT_LANGUAGE;
};

export const setLanguage = (lang: Language): void => {
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch { /* ignore */ }
};

export const t = (key: string): string => {
    const lang = getLanguage();
    const keys = key.split('.');
    let result: unknown = translations[lang];
    for (const k of keys) {
        if (result && typeof result === 'object' && k in (result as Record<string, unknown>)) {
            result = (result as Record<string, unknown>)[k];
        } else {
            return key;
        }
    }
    return typeof result === 'string' ? result : key;
};

export const LANGUAGES: { code: Language; label: string }[] = [
    { code: 'bn', label: 'বাংলা' },
    { code: 'en', label: 'English' }
];

export type { Language, Translations };
