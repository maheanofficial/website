import './SkeletonCard.css';

interface SkeletonCardProps {
    count?: number;
}

function SingleSkeleton() {
    return (
        <div className="skeleton-card" aria-hidden="true">
            <div className="skeleton-poster" />
            <div className="skeleton-content">
                <div className="skeleton-line skeleton-meta" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-title-short" />
                <div className="skeleton-stats">
                    <div className="skeleton-pill" />
                    <div className="skeleton-pill" />
                    <div className="skeleton-pill" />
                </div>
                <div className="skeleton-line skeleton-excerpt" />
                <div className="skeleton-line skeleton-excerpt" />
                <div className="skeleton-line skeleton-excerpt-short" />
                <div className="skeleton-author">
                    <div className="skeleton-avatar" />
                    <div className="skeleton-line skeleton-author-name" />
                </div>
            </div>
        </div>
    );
}

export default function SkeletonCard({ count = 3 }: SkeletonCardProps) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <SingleSkeleton key={i} />
            ))}
        </>
    );
}
