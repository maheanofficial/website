import { useState } from 'react';
import './CookieConsent.css';

const CONSENT_STORAGE_KEY = 'mahean_cookie_notice_ack_v1';

const getInitialVisibility = () => {
    if (typeof window === 'undefined') return false;
    try {
        return !localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
        return true;
    }
};

const CookieConsent = () => {
    const [visible, setVisible] = useState(getInitialVisibility);

    const acknowledge = () => {
        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, '1');
        } catch {
            // Ignore storage failures and only close locally.
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <aside className="cookie-consent" role="dialog" aria-label="Cookie notice">
            <p className="cookie-consent__text">
                This site uses cookies, including Google AdSense cookies, to improve content and show relevant ads.
                Read the
                {' '}
                <a href="/privacy">Privacy Policy</a>
                {' '}
                and manage ad preferences in
                {' '}
                <a href="https://adsettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ad Settings</a>.
            </p>
            <button type="button" className="cookie-consent__button" onClick={acknowledge}>
                I Understand
            </button>
        </aside>
    );
};

export default CookieConsent;
