import { useEffect } from 'react';
import { ADSENSE_ENABLED, ADSENSE_PUBLISHER_ID } from '../utils/adsense';

const SCRIPT_ID = 'google-adsense-script';
const ADSENSE_SCRIPT_SELECTOR = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';
const PLACEHOLDER_TOKEN = '__ADSENSE_PUBLISHER_ID__';

const isValidPublisherId = (value: string) => /^ca-pub-\d{6,}$/i.test(value.trim());
const shouldReplacePublisherValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.includes(PLACEHOLDER_TOKEN)) return true;
    return !isValidPublisherId(trimmed);
};

const buildAdsenseScriptSrc = () =>
    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

const ensureScriptSource = (script: HTMLScriptElement) => {
    const expected = buildAdsenseScriptSrc();
    if (script.src !== expected) {
        script.src = expected;
    }
    script.crossOrigin = 'anonymous';
    script.async = true;
};

const ensureAdsenseMeta = () => {
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="google-adsense-account"]');
    if (existingMeta) {
        if (shouldReplacePublisherValue(existingMeta.content)) {
            existingMeta.content = ADSENSE_PUBLISHER_ID;
        }
        return;
    }

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'google-adsense-account');
    meta.setAttribute('content', ADSENSE_PUBLISHER_ID);
    document.head.appendChild(meta);
};

const ensureAdsenseScript = () => {
    const scriptById = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (scriptById) {
        ensureScriptSource(scriptById);
        return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(ADSENSE_SCRIPT_SELECTOR);
    if (existingScript) {
        existingScript.id = SCRIPT_ID;
        ensureScriptSource(existingScript);
        return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = buildAdsenseScriptSrc();
    ensureScriptSource(script);
    document.head.appendChild(script);
};

const AdSenseScript = () => {
    useEffect(() => {
        if (!ADSENSE_ENABLED) return;
        ensureAdsenseMeta();
        ensureAdsenseScript();
    }, []);

    return null;
};

export default AdSenseScript;
