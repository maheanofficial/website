import { useEffect, useMemo, useState } from 'react';
import SEO from '../components/SEO';
import StoryCard from '../components/StoryCard';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import './SeriesPage.css';

type StatusFilter = 'all' | 'ongoing' | 'completed';

const SeriesPage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    useEffect(() => {
        let isMounted = true;
        const loadStories = async () => {
            const data = await getStories();
            if (isMounted) setStories(data);
        };
        loadStories();
        return () => { isMounted = false; };
    }, []);

    const seriesStories = useMemo(() => {
        const base = stories.filter((s) => (s.parts?.length || 0) > 1 || stories.length > 0);
        const all = base.length > 0 ? base : stories;

        if (statusFilter === 'ongoing') {
            return all.filter((s) => {
                const st = String(s.status || '');
                return st === 'ongoing' || st === 'চলমান';
            });
        }
        if (statusFilter === 'completed') {
            return all.filter((s) => {
                const st = String(s.status || '');
                return st === 'completed' || st === 'সমাপ্ত';
            });
        }
        return all;
    }, [stories, statusFilter]);

    const sortedStories = useMemo(() => {
        return [...seriesStories].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [seriesStories]);

    const tabs: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: 'সব সিরিজ' },
        { key: 'ongoing', label: 'চলমান' },
        { key: 'completed', label: 'সমাপ্ত' },
    ];

    return (
        <div className="series-page page-offset">
            <SEO
                title="সিরিজসমূহ - GolpoHub"
                description="ধারাবাহিক বাংলা গল্পের সম্পূর্ণ সংগ্রহ দেখুন।"
                keywords="Bangla Series, Bengali Episodes, Serialized Stories"
                canonicalUrl="/series"
            />

            <div className="container">
                <div className="series-hero">
                    <h1 className="series-title">সিরিজসমূহ</h1>
                    <p className="series-subtitle">
                        ধারাবাহিক বাংলা গল্পের সম্পূর্ণ সংগ্রহ — একাধিক পর্বে সাজানো।
                    </p>
                </div>

                <div className="series-filter-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`series-filter-tab ${statusFilter === tab.key ? 'active' : ''}`}
                            onClick={() => setStatusFilter(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="series-grid">
                    {sortedStories.length > 0 ? (
                        sortedStories.map((story, index) => (
                            <StoryCard key={story.id} story={story} index={index} />
                        ))
                    ) : (
                        <div className="series-empty">
                            কোনো সিরিজ পাওয়া যায়নি।
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeriesPage;
