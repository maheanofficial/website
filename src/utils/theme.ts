export type ThemeMode = 'light' | 'dark' | 'system';

export const APPEARANCE_STORAGE_KEY = 'mahean_settings_appearance';

const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (mode: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const resolved = mode === 'system' ? getSystemTheme() : mode;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-mode', mode);
};

export const clearTheme = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    root.removeAttribute('data-theme-mode');
};

let systemListenerAttached = false;

export const initTheme = (mode: ThemeMode) => {
    applyTheme(mode);

    if (typeof window === 'undefined' || systemListenerAttached || !window.matchMedia) {
        return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
        const root = document.documentElement;
        if (root.getAttribute('data-theme-mode') === 'system') {
            applyTheme('system');
        }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
    } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
    }

    systemListenerAttached = true;
};

export const getStoredTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    return 'system';
};
