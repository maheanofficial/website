import { Link } from 'react-router-dom';
import { PenTool, BookOpen, Eye, UserCheck } from 'lucide-react';
import { getAllAuthors } from '../utils/authorManager';
import { getStories } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import './StoryCard.css'; // Import StoryCard CSS to inherit exact styles

const AuthorsGrid = () => {
    const authors = getAllAuthors();
    const allStories = getStories();

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
        <section className="authors-grid-section py-20">
            <div className="container mx-auto px-4">

                {/* Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full mb-4 border border-amber-500/20">
                        <PenTool size={16} />
                        <span className="text-sm font-medium">আমাদের লেখকবৃন্দ</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        জনপ্রিয় <span className="text-gray-500">লেখকগণ</span>
                    </h2>
                    <p className="text-gray-400 text-base max-w-xl mx-auto">
                        যাদের কলমে উঠে আসে অসাধারণ সব গল্প ও চরিত্র।
                    </p>
                </div>

                {/* Grid Layout - Matching StoriesPage.css grid classes if possible, or using standard grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {authorsWithStats.map((author, index) => (
                        <article
                            key={author.username}
                            className="story-card group"
                            style={{ minHeight: 'auto' }}
                        >
                            {/* Image Section (Avatar as Cover) */}
                            <div className="story-card-image">
                                <img
                                    src={author.avatar}
                                    alt={author.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                                    <div className="author-avatar ring-1 ring-amber-500/30">
                                        <img src={author.avatar} alt={author.name} />
                                    </div>
                                    <span className="author-name flex items-center gap-1 text-amber-500/80">
                                        <UserCheck size={12} />
                                        ভেরিফাইড প্রোফাইল
                                    </span>
                                </div>

                                {/* Title (Author Name) */}
                                <Link to={`/stories?author=${encodeURIComponent(author.name)}`} className="story-card-title-link">
                                    <h3 className="story-card-title">{author.name}</h3>
                                </Link>

                                {/* Stats Row */}
                                <div className="story-card-stats">
                                    <div className="stat-item">
                                        <BookOpen size={14} className="text-gray-400" />
                                        <span>{toBanglaNumber(author.storyCount)} টি গল্প</span>
                                    </div>
                                    <div className="stat-item">
                                        <Eye size={14} className="text-gray-400" />
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

            </div>
        </section>
    );
};

export default AuthorsGrid;
