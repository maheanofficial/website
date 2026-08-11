import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import './OfflineBanner.css';

export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(() =>
        typeof navigator !== 'undefined' ? !navigator.onLine : false
    );

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="offline-banner offline-banner-visible" role="status" aria-live="polite">
            <span className="offline-dot" />
            <WifiOff size={15} />
            <span>আপনি অফলাইনে আছেন। সংরক্ষিত গল্পগুলো পড়তে পারবেন।</span>
        </div>
    );
}
