import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function PushSubscription() {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
        }
    }, []);

    if (typeof Notification === 'undefined' || permission === 'denied') {
        return null;
    }

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                const registration = await navigator.serviceWorker?.ready;
                if (registration) {
                    console.log('[push] Notification permission granted');
                }
            }
        } catch (err) {
            console.warn('[push] Failed to request permission:', err);
        } finally {
            setLoading(false);
        }
    };

    if (permission === 'granted') {
        return (
            <span className="footer-link" style={{ opacity: 0.6, cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={14} /> নোটিফিকেশন চালু আছে
            </span>
        );
    }

    return (
        <button
            type="button"
            className="footer-link"
            onClick={handleSubscribe}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: 0, font: 'inherit', color: 'inherit' }}
            aria-label="নোটিফিকেশন চালু করুন"
        >
            <BellOff size={14} /> {loading ? 'অপেক্ষা করুন...' : '🔔 নোটিফিকেশন চালু করুন'}
        </button>
    );
}
