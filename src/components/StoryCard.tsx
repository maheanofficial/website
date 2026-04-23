import { Link } from 'react-router-dom';
import { Eye, Layers3 } from 'lucide-react';
import { toBanglaNumber } from '../utils/numberFormatter';
import type { Story } from '../utils/storyManager';
import { buildTagFilterPath } from '../utils/storyFilters';
import SmartImage from './SmartImage';
import './StoryCard.css';

interface StoryCardProps {
    story: Story;
    index?: number;
}

const GolpoHubWatermark = () => (
    <span className="gh-watermark">
        <span className="gh-watermark__golpo">গল্প</span>
        <span className="gh-watermark__hub">Hub</span>
    </span>
);

export default function StoryCard({ story, index = 0 }: StoryCardProps) {
    const displayCategories = (story.categories || (story.category ? [story.category] : [])).filter(Boolean).slice(0, 3);
    const displayTags = (story.tags || []).filter(Boolean).slice(0, 4);
    const totalParts = Math.max(1, story.parts?.length || 1);
    const storySeason = Number.isFinite(story.season) ? Math.max(1, Math.floor(story.season as number)) : 1;
    const storyLink = `/stories/${story.slug || story.id}`;
    const displayExcerpt = (story.excerpt || '').trim();

    const statusRaw = String(story.status || '');
    const statusLabel = statusRaw === 'completed' || statusRaw === 'সমাপ্ত' ? 'সমাপ্ত'
        : statusRaw === 'ongoing' || statusRaw === 'চলমান' ? 'চলমান'
        : null;
    const statusClass = statusLabel === 'সমাপ্ত' ? 'gh-badge--completed' : statusLabel === 'চলমান' ? 'gh-badge--ongoing' : '';

    const hasRealCover = Boolean(story.cover_image || story.image);

    return (
        <div className="gh-card-wrapper fade-in-up" style={{ animationDelay: `${index * 0.07}s` }}>
            {statusLabel && (
                <div className="gh-badge-row">
                    <span className={`gh-status-badge ${statusClass}`}>{statusLabel}</span>
                </div>
            )}

            <article className="gh-card">
                <Link to={storyLink} className="gh-card__cover-link">
                    <div className="gh-card__cover">
                        <GolpoHubWatermark />
                        {hasRealCover ? (
                            <SmartImage
                                src={story.cover_image || story.image}
                                alt={story.title}
                                className="gh-card__cover-img"
                                showFullText={false}
                            />
                        ) : (
                            <div className="gh-card__cover-text">
                                <span className="gh-card__title-in-cover">{story.title}</span>
                                <span className="gh-card__author-in-cover">{story.author || 'লেখক'}</span>
                            </div>
                        )}
                    </div>
                </Link>
            </article>

            <div className="gh-card__below">
                <Link to={storyLink} className="gh-card__title-link">
                    <h3 className="gh-card__title">{story.title}</h3>
                </Link>

                {displayExcerpt && (
                    <p className="gh-card__excerpt">{displayExcerpt}</p>
                )}

                {(displayCategories.length > 0 || displayTags.length > 0) && (
                    <div className="gh-card__pills">
                        {displayCategories.map((cat) => (
                            <Link key={cat} to={`/categories/${encodeURIComponent(cat)}`} className="gh-pill gh-pill--cat">
                                {cat}
                            </Link>
                        ))}
                        {displayTags.map((tag) => (
                            <Link key={tag} to={buildTagFilterPath(tag)} className="gh-pill gh-pill--tag">
                                #{tag}
                            </Link>
                        ))}
                    </div>
                )}

                <div className="gh-card__meta-row">
                    <div className="gh-card__author-cell">
                        <SmartImage
                            src=""
                            alt={story.author || 'লেখক'}
                            className="gh-card__author-avatar"
                            isRound={true}
                        />
                        <span className="gh-card__author-name">{story.author || 'লেখক'}</span>
                    </div>
                    <div className="gh-card__stats">
                        <span className="gh-stat">
                            <Layers3 size={13} />
                            সিজন: {toBanglaNumber(storySeason)}
                        </span>
                        <span className="gh-stat">পর্ব: {toBanglaNumber(totalParts)}</span>
                        <span className="gh-stat">
                            <Eye size={13} />
                            {toBanglaNumber(story.views || 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
