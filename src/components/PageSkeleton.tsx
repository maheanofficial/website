import './SkeletonCard.css';

export default function PageSkeleton() {
    return (
        <div className="page-skeleton" aria-hidden="true" style={{
            padding: '2rem 1rem',
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
        }}>
            {/* Hero skeleton */}
            <div style={{
                height: '200px',
                borderRadius: '16px',
                background: 'linear-gradient(90deg, var(--bg-tertiary, #1a1a2e) 25%, var(--bg-secondary, #16213e) 50%, var(--bg-tertiary, #1a1a2e) 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.6s ease-in-out infinite'
            }} />
            {/* Title skeleton */}
            <div style={{
                width: '60%',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, var(--bg-tertiary, #1a1a2e) 25%, var(--bg-secondary, #16213e) 50%, var(--bg-tertiary, #1a1a2e) 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
                animationDelay: '0.1s'
            }} />
            {/* Cards grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.06))'
                    }}>
                        <div style={{
                            aspectRatio: '16/9',
                            background: 'linear-gradient(90deg, var(--bg-tertiary, #1a1a2e) 25%, var(--bg-secondary, #16213e) 50%, var(--bg-tertiary, #1a1a2e) 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
                            animationDelay: `${0.1 * i}s`
                        }} />
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{
                                width: '70%', height: '16px', borderRadius: '6px',
                                background: 'linear-gradient(90deg, var(--bg-tertiary, #1a1a2e) 25%, rgba(255,255,255,0.04) 50%, var(--bg-tertiary, #1a1a2e) 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
                                animationDelay: `${0.15 * i}s`
                            }} />
                            <div style={{
                                width: '90%', height: '12px', borderRadius: '6px',
                                background: 'linear-gradient(90deg, var(--bg-tertiary, #1a1a2e) 25%, rgba(255,255,255,0.04) 50%, var(--bg-tertiary, #1a1a2e) 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
                                animationDelay: `${0.2 * i}s`
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
