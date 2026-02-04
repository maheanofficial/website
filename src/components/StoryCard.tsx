import { Link } from 'react-router-dom';
import type { Story } from '../utils/storyManager';
import { formatLongDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
import SmartImage from './SmartImage';
import './StoryCard.css';

interface StoryCardProps {
    story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
    return (
        <article className="story-card">
            <div className="story-card-image">
                <SmartImage
                    src={story.cover_image}
                    alt={story.title}
                    className="w-full h-full object-cover"
                    showFullText={true}
                />
                <div className="story-card-category">
                    <span className="category-badge">{story.category}</span>
                </div>
            </div>

            <div className="story-card-content">
                <div className="story-card-author">
                    <div className="author-avatar">
                        <SmartImage
                            src={undefined}
                            alt={story.author || 'Author'}
                            isRound={true}
                            className="w-full h-full object-cover"
                            showFullText={true}
                        />
                    </div>
                    <span className="author-name">{story.author}</span>
                </div>

                <Link to={`/stories/${story.slug || story.id}`} className="story-card-title-link">
                    <h3 className="story-card-title">{story.title}</h3>
                </Link>

                <div className="story-card-stats">
                    <div className="stat-item">
                        <span>{toBanglaNumber(story.parts?.length || 0)} পর্ব</span>
                    </div>
                    <div className="stat-item">
                        <span>{toBanglaNumber(story.views || 0)} দেখা</span>
                    </div>
                </div>

                <div className="story-card-date">{formatLongDate(story.date)}</div>
            </div>

            <div className="story-card-footer">
                <Link to={`/stories/${story.slug || story.id}`} className="btn-read-more">
                    বিস্তারিত পড়ুন
                </Link>
            </div>
        </article>
    );
}
