import './BrandLogo.css';

interface BrandLogoProps {
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    size?: 'sm' | 'md' | 'lg';
}

const BrandLogo = ({ className = '', style, size = 'md' }: BrandLogoProps) => {
    return (
        <span className={`brand-logo brand-logo--${size} ${className}`} style={style}>
            <span className="brand-logo__golpo">গল্প</span>
            <span className="brand-logo__hub">Hub</span>
        </span>
    );
};

export default BrandLogo;
