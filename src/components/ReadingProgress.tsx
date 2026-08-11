import { useEffect, useState } from 'react';
import './ReadingProgress.css';

export default function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const docEl = document.documentElement;
            const scrollTop = window.scrollY || docEl.scrollTop;
            const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
            if (scrollHeight <= 0) {
                setProgress(0);
                return;
            }
            setProgress(Math.min(100, Math.round((scrollTop / scrollHeight) * 100)));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className="reading-progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Reading progress: ${progress}%`}
        >
            <div
                className="reading-progress-bar"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
