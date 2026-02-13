import { Link } from 'react-router-dom';
import type { Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import './StoryCard.css';

interface StoryCardProps {
    story: Story;
    index?: number;
}

export default function StoryCard({ story, index = 0 }: StoryCardProps) {
    // Demo tags matching the screenshot for visual fidelity
    const mockTags = ['ডার্ক রোমান্স', 'রহস্য', 'থ্রিলার', '#প্রতিশোধ'];
    const fallbackTags = story.category ? [story.category] : mockTags;
    const displayTags = (story.tags && story.tags.length > 0 ? story.tags : fallbackTags)
        .filter(Boolean)
        .slice(0, 3);
    const toTagLabel = (tag: string) => (tag.startsWith('#') ? tag : `#${tag}`);

    return (
        <article
            className="story-card fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            {/* Typographic Cover Area (The "Black Box") */}
            <Link to={`/stories/${story.slug || story.id}`} className="story-card-cover-link">
                <div className="story-card-poster">
                    {/* GolpoKotha Badge (Top Right of Poster) */}
                    <div className="golpo-corner-badge">
                        <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" className="golpo-logo-badge" />
                    </div>

                    {/* Central Typographic Content */}
                    <div className="poster-content">
                        <h2 className="poster-title">{story.title}</h2>
                        <p className="poster-author">{story.author}</p>
                    </div>
                </div>
            </Link>

            {/* Helper Content Area */}
            <div className="story-card-content">
                {/* Title (Repeated) */}
                <Link to={`/stories/${story.slug || story.id}`} className="story-card-title-link">
                    <h3 className="card-title-small">{story.title}</h3>
                </Link>

                {/* Excerpt */}
                <p className="story-excerpt line-clamp-3">
                    {story.excerpt || "গল্পের সংক্ষিপ্ত সারাংশ এখানে থাকবে..."}
                </p>

                {/* Tags */}
                <div className="story-tags">
                    {displayTags.map((tag) => {
                        const normalized = tag.startsWith('#') ? tag.slice(1) : tag;
                        return (
                            <Link key={`${story.id}-${tag}`} to={`/stories?tag=${encodeURIComponent(normalized)}`} className="tag">
                                {toTagLabel(tag)}
                            </Link>
                        );
                    })}
                </div>

                {/* Author Row (Small) */}
                <div className="story-card-author-row">
                    <div className="author-avatar-small">
                        {/* If no image, show initial */}
                        <span className="avatar-placeholder">{story.author ? story.author.charAt(0) : 'A'}</span>
                    </div>
                    <span className="author-name-small">{story.author}</span>
                </div>

                {/* Divider & Stats */}
                <div className="card-divider"></div>

                <div className="story-card-footer-stats">
                    <div className="stats-left">
                        <span>সিজন : ১</span>
                        <span>পর্ব : {toBanglaNumber(story.parts?.length || 1)}</span>
                    </div>
                    <div className="stats-right">
                        <span className="eye-icon">👁</span>
                        <span>{toBanglaNumber(story.views || 0)} হা.</span>
                    </div>
                </div>
            </div>
        </article>
    );
}
