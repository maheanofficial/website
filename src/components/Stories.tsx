import { useState, useEffect } from 'react';
import './Stories.css';
import { Link } from 'react-router-dom';
import { getStories, type Story } from '../utils/storyManager';
import { formatLongDate } from '../utils/dateFormatter';

const Stories = () => {
    const [stories, setStories] = useState<Story[]>([]);

    useEffect(() => {
        setStories(getStories().slice(0, 6)); // Show first 6 stories
    }, []);

    return (
        <section className="stories-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">
                        সাম্প্রতিক গল্পসমূহ
                    </h2>
                    <p className="section-subtitle">
                        জীবনের নানা রং, অনুভূতি আর কল্পনার মিশেলে তৈরি কিছু ছোট গল্প।
                    </p>
                </div>

                <div className="stories-grid">
                    {stories.map((story) => (
                        <article key={story.id} className="story-card">
                            <div className="story-content">
                                <span className="story-category">{story.category}</span>
                                <Link to={`/stories/${story.slug || story.id}`} style={{ textDecoration: 'none' }}>
                                    <h3 className="story-title">{story.title}</h3>
                                </Link>
                                <p className="story-excerpt">
                                    {story.parts?.[0]?.content.substring(0, 100)}...
                                </p>

                                <div className="story-meta">
                                    <span>{story.author}</span>
                                    <span>{formatLongDate(story.date)}</span>
                                </div>

                                <Link to={`/stories/${story.slug || story.id}`} className="btn btn-sm btn-secondary read-more-btn">
                                    পড়া শুরু করুন
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    <Link to="/stories#listing" className="btn btn-primary">সব গল্প দেখুন</Link>
                </div>
            </div>
        </section>
    );
};

export default Stories;
