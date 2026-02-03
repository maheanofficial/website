import React, { useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';

interface SmartImageProps {
    src?: string;
    alt: string;
    className?: string;
    isRound?: boolean;
    showFullText?: boolean;
}

const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className, isRound, showFullText }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
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

        let fontSize = '1.15rem';
        if (text.length > 50) fontSize = '0.75rem';
        else if (text.length > 30) fontSize = '0.85rem';
        else if (text.length > 15) fontSize = '1.05rem';
        else fontSize = 'clamp(1.2rem, 3.8vw, 2.2rem)';

        return (
            <div
                className={`${className || ''} bg-gradient-to-br ${colorGradient} rounded-md relative select-none overflow-hidden shadow-inner`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    textAlign: 'center',
                    minHeight: '120px'
                }}
            >
                {/* Subtle Dot Pattern Backdrop */}
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

                <span
                    className="px-4"
                    style={{
                        fontSize: fontSize,
                        fontWeight: 900, // Extra Bold for Bangla
                        lineHeight: '1.2',
                        width: '90%',
                        zIndex: 1,
                        color: 'white',
                        transform: 'translateY(15px)',
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                    }}
                >
                    {text}
                </span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setError(true)}
            loading="lazy"
        />
    );
};

export default SmartImage;
