const toTrimmed = (value: string | undefined) => (value || '').trim();
const DEFAULT_ADSENSE_PUBLISHER_ID = 'ca-pub-6313362498664713';

const normalizePublisherId = (value: string) => {
    if (!value) return '';
    if (value.startsWith('ca-pub-')) return value;
    if (/^\d{6,}$/.test(value)) return `ca-pub-${value}`;
    return value;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
    const normalized = toTrimmed(value).toLowerCase();
    if (!normalized) return defaultValue;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
};

const env = import.meta.env as Record<string, string | undefined>;

export const ADSENSE_PUBLISHER_ID =
    normalizePublisherId(toTrimmed(env.VITE_ADSENSE_PUBLISHER_ID))
    || DEFAULT_ADSENSE_PUBLISHER_ID;
export const ADSENSE_ENABLED = parseBoolean(env.VITE_ADSENSE_ENABLED, true) && Boolean(ADSENSE_PUBLISHER_ID);
export const ADSENSE_SHOW_DEV_PLACEHOLDER = parseBoolean(env.VITE_ADSENSE_SHOW_DEV_PLACEHOLDER, true);

const SLOT_ENV_MAP: Record<string, string> = {
    'homepage-middle-ad': 'VITE_ADSENSE_SLOT_HOMEPAGE_MIDDLE_AD',
    'stories-footer-ad': 'VITE_ADSENSE_SLOT_STORIES_FOOTER_AD',
    'story-top-ad': 'VITE_ADSENSE_SLOT_STORY_TOP_AD',
    'story-bottom-ad': 'VITE_ADSENSE_SLOT_STORY_BOTTOM_AD'
};

const normalizeSlotValue = (value: string | undefined) => {
    const cleaned = toTrimmed(value);
    return /^\d{6,}$/.test(cleaned) ? cleaned : '';
};

export const resolveAdSlot = (slotOrKey?: string) => {
    const input = toTrimmed(slotOrKey);
    if (!input) return '';
    if (/^\d{6,}$/.test(input)) return input;

    const slotFromMappedEnv = normalizeSlotValue(env[SLOT_ENV_MAP[input]]);
    if (slotFromMappedEnv) return slotFromMappedEnv;

    const fallbackSlot = normalizeSlotValue(env.VITE_ADSENSE_SLOT_DEFAULT);
    if (fallbackSlot) return fallbackSlot;

    return '';
};
