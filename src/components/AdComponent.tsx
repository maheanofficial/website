import { useEffect } from 'react';

interface AdComponentProps {
    slot?: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
    className?: string;
    style?: React.CSSProperties;
}

/**
 * AdComponent - Google AdSense integration placeholder
 * Replace the filler div with your real AdSense production code when ready.
 */
const AdComponent = ({ slot, className = '', style }: AdComponentProps) => {
    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, []);

    return (
        <div
            className={`ad-container ${className}`}
            style={{
                margin: '20px 0',
                textAlign: 'center',
                minHeight: '100px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px dashed rgba(245, 158, 11, 0.1)',
                color: 'rgba(255, 255, 255, 0.2)',
                fontSize: '12px',
                overflow: 'hidden',
                ...style
            }}
        >
            {/* Real AdSense Code Starts Here */}
            {/* 
            <ins className="adsbygoogle"
                 style={{ display: 'block' }}
                 data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                 data-ad-slot={slot || "XXXXXXXXXX"}
                 data-ad-format={format}
                 data-full-width-responsive="true"></ins>
            */}
            {/* Real AdSense Code Ends Here */}

            <div className="ad-placeholder-text">
                Advertisement Placeholder
                {slot && <span style={{ display: 'block', fontSize: '10px' }}>Slot: {slot}</span>}
            </div>
        </div>
    );
};

export default AdComponent;
