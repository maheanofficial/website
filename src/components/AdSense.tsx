import AdComponent from './AdComponent';

interface AdSenseProps {
    slot?: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
    responsive?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const AdSense = ({ slot, format = 'auto', responsive = true, className, style }: AdSenseProps) => {
    return (
        <AdComponent
            slot={slot}
            format={format}
            responsive={responsive}
            className={className}
            style={style}
        />
    );
};

export default AdSense;
