import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import StoryCard from '../components/StoryCard';
import { getStories } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import './SeriesPage.css';

const SeriesPage = () => {
    const stories = getStories();
    const seriesStories = stories.filter((story) => (story.parts?.length || 0) > 1);
    const displayStories = seriesStories.length > 0 ? seriesStories : stories;

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredStories = useMemo(() => {
        return displayStories.filter((story) => {
            const matchesSearch =
                story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                story.author?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || story.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [displayStories, searchQuery, statusFilter]);

    const sortedStories = useMemo(() => {
        const list = [...filteredStories];
        list.sort((a, b) => {
            if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
            if (sortBy === 'parts') return (b.parts?.length || 0) - (a.parts?.length || 0);
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        return list;
    }, [filteredStories, sortBy]);

    return (
        <div className="series-page page-offset">
            <SEO
                title="সিরিজ - ধারাবাহিক বাংলা গল্প | Mahean Ahmed"
                description="চলমান ও সমাপ্ত ধারাবাহিক বাংলা গল্পের সম্পূর্ণ সংগ্রহ দেখুন।"
                keywords="Bangla Series, Bengali Episodes, Serialized Stories"
                canonicalUrl="/series"
            />

            <div className="container">
                <div className="series-hero">
                    <span className="series-kicker">ধারাবাহিক গল্প</span>
                    <h1 className="series-title">সিরিজ গল্পের সংগ্রহ</h1>
                    <p className="series-subtitle">
                        একাধিক পর্বে সাজানো গল্পগুলো একসাথে পড়ুন। নতুন সিরিজ যুক্ত করতে চাইলে নিচের বোতামে ক্লিক করুন।
                    </p>
                    <Link to="/login" className="series-cta">
                        নতুন সিরিজ লিখুন
                    </Link>
                </div>

                <div className="series-filter-bar">
                    <div className="series-search">
                        <input
                            type="text"
                            placeholder="সিরিজ বা লেখকের নাম লিখুন..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="series-filters">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">সব স্ট্যাটাস</option>
                            <option value="ongoing">চলমান</option>
                            <option value="completed">সমাপ্ত</option>
                            <option value="published">প্রকাশিত</option>
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="latest">সর্বশেষ</option>
                            <option value="popular">জনপ্রিয়</option>
                            <option value="parts">সবচেয়ে বেশি পর্ব</option>
                        </select>
                    </div>
                </div>

                <div className="series-summary">
                    <p>
                        মোট {toBanglaNumber(sortedStories.length)} টি সিরিজ পাওয়া গেছে
                    </p>
                </div>

                <div className="series-grid">
                    {sortedStories.length > 0 ? (
                        sortedStories.map((story, index) => (
                            <StoryCard key={story.id} story={story} index={index} />
                        ))
                    ) : (
                        <div className="series-empty">
                            কোনো সিরিজ পাওয়া যায়নি। অন্য কীওয়ার্ড দিয়ে আবার চেষ্টা করুন।
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeriesPage;
