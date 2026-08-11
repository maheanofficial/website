import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import './PwaInstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;

            const dismissedUntil = localStorage.getItem('pwa_dismissed_until');
            if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
                return;
            }

            setDeferredPrompt(promptEvent);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        setIsVisible(false);
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
            console.log('[pwa] User accepted PWA install prompt');
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        // Dismiss for 7 days
        const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem('pwa_dismissed_until', sevenDays.toString());
    };

    if (!isVisible) return null;

    return (
        <div className="pwa-install-banner fade-in-up">
            <div className="pwa-install-icon">
                <Smartphone size={24} />
            </div>
            <div className="pwa-install-content">
                <strong>মাহিয়ানের গল্পকথা অ্যাপ</strong>
                <p>সহজেই মোবাইলে অ্যাপ হিসেবে পড়তে ইনস্টল করুন!</p>
            </div>
            <div className="pwa-install-actions">
                <button type="button" className="pwa-btn primary" onClick={handleInstallClick}>
                    <Download size={14} /> ইনস্টল করুন
                </button>
                <button type="button" className="pwa-btn secondary" onClick={handleDismiss}>
                    পরে
                </button>
            </div>
            <button type="button" className="pwa-close-btn" onClick={handleDismiss} aria-label="বন্ধ করুন">
                <X size={16} />
            </button>
        </div>
    );
}
