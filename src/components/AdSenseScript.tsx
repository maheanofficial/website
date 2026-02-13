import { useEffect } from 'react';
import { ADSENSE_ENABLED, ADSENSE_PUBLISHER_ID } from '../utils/adsense';

const SCRIPT_ID = 'google-adsense-script';
const ADSENSE_SCRIPT_SELECTOR = 'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';

const ensureAdsenseMeta = () => {
    const existingMeta = document.querySelector<HTMLMetaElement>('meta[name="google-adsense-account"]');
    if (existingMeta) {
        if (!existingMeta.content) {
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
    if (document.getElementById(SCRIPT_ID)) return;

    const existingScript = document.querySelector<HTMLScriptElement>(ADSENSE_SCRIPT_SELECTOR);
    if (existingScript) {
        existingScript.id = SCRIPT_ID;
        return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
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
