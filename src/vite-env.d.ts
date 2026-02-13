/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ADSENSE_ENABLED?: string;
    readonly VITE_ADSENSE_PUBLISHER_ID?: string;
    readonly VITE_ADSENSE_SLOT_DEFAULT?: string;
    readonly VITE_ADSENSE_SLOT_HOMEPAGE_MIDDLE_AD?: string;
    readonly VITE_ADSENSE_SLOT_STORIES_FOOTER_AD?: string;
    readonly VITE_ADSENSE_SLOT_STORY_TOP_AD?: string;
    readonly VITE_ADSENSE_SLOT_STORY_BOTTOM_AD?: string;
    readonly VITE_ADSENSE_SHOW_DEV_PLACEHOLDER?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

