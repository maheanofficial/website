import { useEffect, useMemo, useRef } from 'react';
import {
    ADSENSE_ENABLED,
    ADSENSE_PUBLISHER_ID,
    ADSENSE_SHOW_DEV_PLACEHOLDER,
    resolveAdSlot
} from '../utils/adsense';

interface AdComponentProps {
    slot?: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
    responsive?: boolean;
    layoutKey?: string;
    className?: string;
    style?: React.CSSProperties;
}

type AdsWindow = Window & {
    adsbygoogle?: unknown[];
};

const AD_CONTAINER_STYLE: React.CSSProperties = {
    margin: '20px 0',
    textAlign: 'center',
    minHeight: '100px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
};

const DEV_PLACEHOLDER_STYLE: React.CSSProperties = {
    width: '100%',
    minHeight: '100px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    border: '1px dashed rgba(245, 158, 11, 0.2)',
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: '12px'
};

const AdComponent = ({
    slot,
    format = 'auto',
    responsive = true,
    layoutKey,
    className = '',
    style
}: AdComponentProps) => {
    const adRef = useRef<HTMLModElement | null>(null);
    const hasRequestedAdRef = useRef(false);
    const resolvedSlot = useMemo(() => resolveAdSlot(slot), [slot]);
    const canRenderLiveAd = ADSENSE_ENABLED && Boolean(resolvedSlot);

    useEffect(() => {
        if (!canRenderLiveAd) return;
        if (!adRef.current || hasRequestedAdRef.current) return;

        const requestAd = () => {
            if (!adRef.current || hasRequestedAdRef.current) return;
            try {
                const adsWindow = window as AdsWindow;
                (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({});
                hasRequestedAdRef.current = true;
            } catch (error) {
                console.error('AdSense render failed:', error);
            }
        };

        // Let the script load if it was injected moments ago.
        const timerId = window.setTimeout(requestAd, 250);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [canRenderLiveAd, resolvedSlot]);

    if (canRenderLiveAd) {
        return (
            <div className={`ad-container ${className}`} style={{ ...AD_CONTAINER_STYLE, ...style }}>
                <ins
                    ref={adRef}
                    className="adsbygoogle"
                    style={{ display: 'block', width: '100%' }}
                    data-ad-client={ADSENSE_PUBLISHER_ID}
                    data-ad-slot={resolvedSlot}
                    data-ad-format={format}
                    data-ad-layout-key={format === 'fluid' && layoutKey ? layoutKey : undefined}
                    data-full-width-responsive={responsive ? 'true' : 'false'}
                />
            </div>
        );
    }

    // In production, hide ad placeholders when no valid AdSense config exists.
    if (import.meta.env.PROD || !ADSENSE_SHOW_DEV_PLACEHOLDER) {
        return null;
    }

    return (
        <div className={`ad-container ${className}`} style={{ ...AD_CONTAINER_STYLE, ...style }}>
            <div style={DEV_PLACEHOLDER_STYLE}>
                <div>
                    Advertisement Placeholder
                    <span style={{ display: 'block', fontSize: '10px', marginTop: '6px' }}>
                        slot: {slot || 'missing'} {resolvedSlot ? `(resolved: ${resolvedSlot})` : '(configure env slot)'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AdComponent;
