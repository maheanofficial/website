import React, { useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';

const THUMBNAIL_COVER_PATH_SEGMENT = '/uploads/stories/covers/';
const THUMBNAIL_CACHE_BUST_VERSION = '20260401-1';

const appendCacheBust = (url: string) => {
    const value = String(url || '').trim();
    if (!value || !value.includes(THUMBNAIL_COVER_PATH_SEGMENT)) {
        return value;
    }
    if (/[?&]tbv=/.test(value)) {
        return value;
    }
    return `${value}${value.includes('?') ? '&' : '?'}tbv=${THUMBNAIL_CACHE_BUST_VERSION}`;
};

interface SmartImageProps {
    src?: string;
    alt: string;
    className?: string;
    isRound?: boolean;
    showFullText?: boolean;
    loading?: 'lazy' | 'eager';
    decoding?: 'sync' | 'async' | 'auto';
    fetchPriority?: 'high' | 'low' | 'auto';
}

const SmartImage: React.FC<SmartImageProps> = ({
    src,
    alt,
    className,
    isRound,
    showFullText,
    loading = 'lazy',
    decoding = 'async',
    fetchPriority = 'auto'
}) => {
    const [error, setError] = useState(false);
    const resolvedSrc = appendCacheBust(String(src || ''));

    if (!resolvedSrc || error) {
        // Generate a color based on the name hash
        const colors = [
            'from-rose-600 to-rose-900',
            'from-blue-600 to-blue-900',
            'from-emerald-600 to-emerald-900',
            'from-amber-600 to-amber-900',
            'from-purple-600 to-purple-900',
            'from-pink-600 to-pink-900',
            'from-indigo-600 to-indigo-900',
            'from-teal-600 to-teal-900'
        ];
        const hash = (alt || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colorGradient = colors[hash % colors.length];

        const text = alt || '...';

        // 1. Logic for Avatars (Rounded)
        if (isRound) {
            return (
                <div className={`${className || ''} bg-gradient-to-br ${colorGradient} rounded-full relative flex items-center justify-center text-white/90 select-none overflow-hidden p-1 shadow-inner aspect-square`}>
                    {showFullText ? (
                        <span className="text-[10px] text-center leading-tight font-black break-words w-full px-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontWeight: 900 }}>
                            {text}
                        </span>
                    ) : (
                        <User size="60%" strokeWidth={1.5} className="drop-shadow-md" />
                    )}
                </div>
            );
        }

        // 2. Logic for Story Covers / Category Images
        if (!showFullText) {
            return (
                <div className={`${className || ''} bg-gradient-to-br ${colorGradient} rounded-md relative flex items-center justify-center text-white/90 select-none overflow-hidden p-1 shadow-inner`}>
                    <ImageIcon size="40%" strokeWidth={1.5} className="drop-shadow-md" />
                </div>
            );
        }

        const charCount = text.length;
        let fontSize = 'clamp(1.1rem, 4vw, 1.8rem)';
        if (charCount > 40) fontSize = 'clamp(0.7rem, 2.5vw, 1rem)';
        else if (charCount > 25) fontSize = 'clamp(0.85rem, 3vw, 1.2rem)';
        else if (charCount > 15) fontSize = 'clamp(1rem, 3.5vw, 1.4rem)';

        return (
            <div
                className={`${className || ''} bg-gradient-to-br ${colorGradient} rounded-md select-none overflow-hidden shadow-inner`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    textAlign: 'center',
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    padding: '12px',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px', pointerEvents: 'none' }}></div>
                <span
                    style={{
                        fontSize,
                        fontWeight: 900,
                        lineHeight: '1.3',
                        maxWidth: '100%',
                        zIndex: 1,
                        color: 'white',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {text}
                </span>
            </div>
        );
    }

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            onError={() => setError(true)}
            loading={loading}
            decoding={decoding}
            fetchPriority={fetchPriority}
        />
    );
};

export default SmartImage;
