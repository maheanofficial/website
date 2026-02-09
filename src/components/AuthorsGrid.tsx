import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Eye, UserCheck } from 'lucide-react';
import { getAllAuthors, type Author } from '../utils/authorManager';
import { getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import SmartImage from './SmartImage';
import './StoryCard.css'; // Import StoryCard CSS to inherit exact styl

const AuthorsGrid = () => {
    const [authors, setAuthors] = useState<Author[]>([]);
    const [allStories, setAllStories] = useState<Story[]>([]);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            const [authorData, storyData] = await Promise.all([getAllAuthors(), getStories()]);
            if (isMounted) {
                setAuthors(authorData);
                setAllStories(storyData);
            }
        };
        loadData();
        return () => {
            isMounted = false;
        };
    }, []);

    // 1. Calculate stats and sort by Total Views (descending)
    const authorsWithStats = authors.map(author => {
        const authorStories = allStories.filter(s => s.author === author.name);
        const storyCount = authorStories.length;
        const totalViews = authorStories.reduce((sum, story) => sum + (story.views || 0), 0);
        return {
            ...author,
            storyCount,
            totalViews
        };
    }).sort((a, b) => b.totalViews - a.totalViews);

    return (
        <section className="authors-grid-section">
            <div className="stories-grid-top mb-12">
                {authorsWithStats.map((author, index) => (
                    <article
                        key={author.username}
                        className="story-card group fade-in-up"
                        style={{ minHeight: 'auto', animationDelay: `${index * 0.1}s` }}
                    >
                        {/* Image Section (Avatar as Cover) */}
                        <div className="story-card-image">
                            <SmartImage
                                src={author.avatar}
                                alt={author.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                showFullText={true}
                            />
                            {/* Rank Category Badge */}
                            {index < 3 && (
                                <div className="story-card-category">
                                    <span className="category-badge">#{toBanglaNumber(index + 1)} শীর্ষ লেখক</span>
                                </div>
                            )}
                        </div>

                        <div className="story-card-content">
                            {/* Author Small Row */}
                            <div className="story-card-author">
                                <Link to={`/stories?author=${encodeURIComponent(author.name)}`} className="author-link-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="author-avatar ring-1 ring-amber-500/30">
                                        <SmartImage src={author.avatar} alt={author.name} />
                                    </div>
                                    <span className="author-name flex items-center gap-1 text-amber-500/80">
                                        <UserCheck size={12} />
                                        ভেরিফাইড প্রোফাইল
                                    </span>
                                </Link>
                            </div>

                            {/* Title (Author Name) */}
                            <Link to={`/stories?author=${encodeURIComponent(author.name)}`} className="story-card-title-link">
                                <h3 className="story-card-title">{author.name}</h3>
                            </Link>

                            {/* Stats Row */}
                            <div className="story-card-stats">
                                <div className="stat-item">
                                    <BookOpen size={14} />
                                    <span>{toBanglaNumber(author.storyCount)} টি গল্প</span>
                                </div>
                                <div className="stat-item">
                                    <Eye size={14} />
                                    <span>{toBanglaNumber(author.totalViews)} বার পঠিত</span>
                                </div>
                            </div>

                            {/* Bio (In place of Date) */}
                            <div className="story-card-date line-clamp-1 mt-3 text-gray-500">
                                {author.bio || "নিয়মিত গল্প লিখছেন..."}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="story-card-footer mt-auto">
                            <Link to={`/stories?author=${encodeURIComponent(author.name)}`} className="btn-read-more">
                                প্রোফাইল দেখুন
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default AuthorsGrid;
