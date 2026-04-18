import { useState } from 'react';
import { SITE_LOGO_SRC } from '../utils/brandAssets';
import './BrandLogo.css';

interface BrandLogoProps {
    alt?: string;
    className?: string;
    src?: string;
    style?: React.CSSProperties;
    fallbackText?: string;
}

const DEFAULT_LABEL = 'মাহিয়ানের গল্পকথা';
const BrandLogo = ({
    alt = DEFAULT_LABEL,
    className = '',
    src = SITE_LOGO_SRC,
    style,
    fallbackText
}: BrandLogoProps) => {
    const [hasError, setHasError] = useState(false);
    const resolvedFallbackText = fallbackText || alt || DEFAULT_LABEL;
    const rootClassName = ['brand-logo', className].filter(Boolean).join(' ');

    if (hasError) {
        return (
            <span className={rootClassName} style={style} role="img" aria-label={alt}>
                <span className="brand-logo__fallback">{resolvedFallbackText}</span>
            </span>
        );
    }

    return (
        <span className={rootClassName} style={style}>
            <img
                src={src}
                alt={alt}
                className="brand-logo__image"
                decoding="async"
                onError={() => setHasError(true)}
            />
        </span>
    );
};

export default BrandLogo;
