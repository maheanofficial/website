import { Link } from 'react-router-dom';
import type { Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import './StoryCard.css';

interface StoryCardProps {
    story: Story;
    index?: number;
}

export default function StoryCard({ story, index = 0 }: StoryCardProps) {
    const isCompleted = story.status === 'completed' || (story.parts && story.parts.length > 10);
    // Demo tags matching the screenshot for visual fidelity
    const mockTags = ['ডার্ক রোমান্স', 'রহস্য', 'থ্রিলার', '#প্রতিশোধ'];

    return (
        <article
            className="story-card fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            {/* 1. Floating Status Badge (Centered Top) */}
            <div className="status-badge-wrapper">
                <span className={`status-badge ${isCompleted ? 'completed' : 'ongoing'}`}>
                    {isCompleted ? 'সমাপ্ত' : 'চলমান'}
                </span>
            </div>

            {/* 2. Typographic Cover Area (The "Black Box") */}
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

            {/* 3. Helper Content Area */}
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
                    {mockTags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                    ))}
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
                <div className="card-divider" style={{ borderColor: '#374151', margin: '12px 0 8px 0' }}></div>

                <div className="story-card-footer-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#e5e7eb', fontWeight: 600, fontFamily: "'Arial', sans-serif" }}>
                    <div className="stats-left" style={{ display: 'flex', gap: '12px' }}>
                        <span>সিজন : ১</span>
                        <span>পর্ব : {toBanglaNumber(story.parts?.length || 0)}</span>
                    </div>
                    <div className="stats-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="eye-icon" style={{ fontSize: '14px' }}>👁</span>
                        <span>{toBanglaNumber(story.views || 0)} হা.</span>
                    </div>
                </div>
            </div>
        </article>
    );
}
