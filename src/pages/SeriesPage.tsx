import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import StoryCard from '../components/StoryCard';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { buildCollectionPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema';
import { SITE_URL } from '../utils/siteMeta';
import './SeriesPage.css';

const SeriesPage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const seriesStories = stories.filter((story) => (story.parts?.length || 0) > 1);
    const displayStories = seriesStories.length > 0 ? seriesStories : stories;

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('latest');

    useEffect(() => {
        let isMounted = true;
        const loadStories = async () => {
            const data = await getStories();
            if (isMounted) {
                setStories(data);
            }
        };
        loadStories();
        return () => {
            isMounted = false;
        };
    }, []);

    const filteredStories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return displayStories;

        return displayStories.filter((story) => {
            const title = story.title.toLowerCase();
            const author = (story.author || '').toLowerCase();
            return title.includes(query) || author.includes(query);
        });
    }, [displayStories, searchQuery]);

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
                title="ধারাবাহিক সিরিজ - বাংলা সিরিজ গল্পের সংগ্রহ | Mahean Ahmed"
                description="বাংলা ধারাবাহিক গল্পের সম্পূর্ণ সংগ্রহ। একাধিক পর্বে সাজানো রোমাঞ্চকর, থ্রিলার ও সাসপেন্স সিরিজ গল্প পড়ুন।"
                keywords="Bangla Series, Bengali Episodes, Serialized Stories, বাংলা সিরিজ, ধারাবাহিক গল্প, বাংলা ধারাবাহিক উপন্যাস"
                canonicalUrl="/series"
                jsonLd={[
                    buildCollectionPageSchema(
                        'ধারাবাহিক বাংলা গল্পের সংগ্রহ - Mahean Ahmed',
                        'একাধিক পর্বে সাজানো বাংলা ধারাবাহিক গল্পের সংগ্রহ।',
                        `${SITE_URL}/series`,
                        sortedStories.slice(0, 20).map(s => ({
                            name: s.title,
                            url: `${SITE_URL}/stories/${s.slug || s.id}`,
                        }))
                    ),
                    buildBreadcrumbSchema([
                        { name: 'হোম', url: '/' },
                        { name: 'সিরিজ', url: '/series' },
                    ]),
                ]}
            />

            <div className="container">
                <div className="series-hero">
                    <span className="series-kicker">ধারাবাহিক গল্প</span>
                    <h1 className="series-title">সিরিজ গল্পের সংগ্রহ</h1>
                    <p className="series-subtitle">
                        একাধিক পর্বে সাজানো গল্পগুলো একসাথে পড়ুন। নতুন সিরিজ যুক্ত করতে চাইলে নিচের বোতামে ক্লিক করুন।
                    </p>
                    <Link to="/admin/dashboard/golpo/create" className="series-cta">
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
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="latest">সর্বশেষ</option>
                            <option value="popular">জনপ্রিয়</option>
                            <option value="parts">সবচেয়ে বেশি পর্ব</option>
                        </select>
                    </div>
                </div>

                <div className="series-summary">
                    <p>
                        মোট {toBanglaNumber(sortedStories.length)} টি সিরিজ পাওয়া গেছে
                    </p>
                </div>

                <div className="series-grid">
                    {sortedStories.length > 0 ? (
                        sortedStories.map((story, index) => (
                            <StoryCard key={story.id} story={story} index={index} />
                        ))
                    ) : (
                        <div className="series-empty">
                            কোনো সিরিজ পাওয়া যায়নি। অন্য কীওয়ার্ড দিয়ে আবার চেষ্টা করুন।
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeriesPage;
