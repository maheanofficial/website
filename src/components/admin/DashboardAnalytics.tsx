import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, BookOpen, FileText, Eye, MessageSquare, Calendar, ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getAllStories, type Story } from '../../utils/storyManager';
import './DashboardAnalytics.css';

const DATE_OPTIONS = [
    'Last 24 Hours',
    'Last 7 Days',
    'Last 30 Days',
    'Last 3 Months',
    'All Time'
] as const;

type DateRangeOption = (typeof DATE_OPTIONS)[number];

type DashboardStat = {
    label: string;
    value: string;
    sub: string;
    icon: LucideIcon;
};

type LeaderboardEntry = {
    id: string;
    title: string;
    subtitle: string;
    views: number;
};

const RANGE_DAYS: Record<DateRangeOption, number | null> = {
    'Last 24 Hours': 1,
    'Last 7 Days': 7,
    'Last 30 Days': 30,
    'Last 3 Months': 90,
    'All Time': null
};

const integerFormatter = new Intl.NumberFormat('en-US');
const averageFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const formatCount = (value: number) => integerFormatter.format(Math.max(0, Math.round(value)));
const formatAverage = (value: number) => averageFormatter.format(Number.isFinite(value) ? value : 0);

const getEpisodeCount = (story: Story) => {
    if (story.parts?.length) return story.parts.length;
    return story.content?.trim() ? 1 : 0;
};

const parseStoryDate = (value?: string) => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

const isStoryInRange = (story: Story, days: number | null, now: number) => {
    if (days === null) return true;
    const timestamp = parseStoryDate(story.date);
    if (timestamp === null) return false;
    const rangeMs = days * 24 * 60 * 60 * 1000;
    return timestamp >= now - rangeMs;
};

const DashboardAnalytics = () => {
    const [dateRange, setDateRange] = useState<DateRangeOption>('Last 7 Days');
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rangeAnchor, setRangeAnchor] = useState(() => Date.now());

    useEffect(() => {
        let isMounted = true;

        const loadStories = async () => {
            setIsLoading(true);
            const allStories = await getAllStories();
            if (!isMounted) return;
            setStories(allStories);
            setIsLoading(false);
        };

        void loadStories();

        return () => {
            isMounted = false;
        };
    }, []);

    const {
        totalEpisodes,
        totalSeries,
        newEpisodes,
        newSeries,
        totalViews,
        totalComments,
        avgViewsPerEpisode,
        avgCommentsPerEpisode,
        mostViewedEpisodes,
        mostViewedSeries
    } = useMemo(() => {
        const rangeDays = RANGE_DAYS[dateRange];
        const storiesInRange = stories.filter((story) => isStoryInRange(story, rangeDays, rangeAnchor));

        const totalSeries = stories.length;
        const totalEpisodes = stories.reduce((sum, story) => sum + getEpisodeCount(story), 0);
        const newSeries = storiesInRange.length;
        const newEpisodes = storiesInRange.reduce((sum, story) => sum + getEpisodeCount(story), 0);
        const totalViews = storiesInRange.reduce((sum, story) => sum + (story.views ?? 0), 0);
        const totalComments = storiesInRange.reduce((sum, story) => sum + (story.comments ?? 0), 0);
        const avgViewsPerEpisode = newEpisodes > 0 ? totalViews / newEpisodes : 0;
        const avgCommentsPerEpisode = newEpisodes > 0 ? totalComments / newEpisodes : 0;

        const mostViewedSeries: LeaderboardEntry[] = storiesInRange
            .map((story) => {
                const episodes = getEpisodeCount(story);
                return {
                    id: story.id,
                    title: story.title,
                    subtitle: `${episodes} ${episodes === 1 ? 'episode' : 'episodes'}`,
                    views: story.views ?? 0
                };
            })
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);

        const mostViewedEpisodes: LeaderboardEntry[] = storiesInRange
            .flatMap((story) => {
                const parts = story.parts?.length
                    ? story.parts
                    : [{ id: `${story.id}-episode-1`, title: 'Episode 01', content: story.content }];
                const episodes = parts.length || 1;
                const viewsPerEpisode = Math.round((story.views ?? 0) / episodes);
                return parts.map((part, index) => ({
                    id: `${story.id}-${part.id ?? index}`,
                    title: part.title?.trim() || `Episode ${String(index + 1).padStart(2, '0')}`,
                    subtitle: story.title,
                    views: viewsPerEpisode
                }));
            })
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);

        return {
            totalEpisodes,
            totalSeries,
            newEpisodes,
            newSeries,
            totalViews,
            totalComments,
            avgViewsPerEpisode,
            avgCommentsPerEpisode,
            mostViewedEpisodes,
            mostViewedSeries
        };
    }, [stories, dateRange, rangeAnchor]);

    const stats: DashboardStat[] = [
        { label: 'New Episodes', value: formatCount(newEpisodes), sub: `out of ${formatCount(totalEpisodes)} total`, icon: FileText },
        { label: 'New Series', value: formatCount(newSeries), sub: `out of ${formatCount(totalSeries)} total`, icon: BookOpen },
        { label: 'Total Views', value: formatCount(totalViews), sub: dateRange, icon: Eye },
        { label: 'Total Comments', value: formatCount(totalComments), sub: dateRange, icon: MessageSquare },
        { label: 'Avg. Views/Episode', value: formatAverage(avgViewsPerEpisode), sub: dateRange, icon: TrendingUp },
        { label: 'Avg. Comments/Episode', value: formatAverage(avgCommentsPerEpisode), sub: dateRange, icon: MessageSquare },
    ];

    return (
        <div className="dashboard-content">
            {/* Header / Date Filter */}
            <div className="dashboard-header-actions">
                <div className="date-picker-container">
                    <div
                        role="button"
                        tabIndex={0}
                        className={`date-trigger-btn ${isDateDropdownOpen ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDateDropdownOpen(!isDateDropdownOpen);
                        }}
                    >
                        <Calendar size={16} className="text-gray-400" />
                        <span className="current-range">{dateRange}</span>
                        <ChevronDown size={14} className={`chevron ${isDateDropdownOpen ? 'rotate' : ''}`} />
                    </div>

                    {isDateDropdownOpen && (
                        <>
                            <div className="dropdown-overlay" onClick={() => setIsDateDropdownOpen(false)}></div>
                            <div className="date-dropdown-menu">
                                {DATE_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        className={`date-option ${dateRange === option ? 'selected' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDateRange(option);
                                            setRangeAnchor(Date.now());
                                            setIsDateDropdownOpen(false);
                                        }}
                                    >
                                        <div className="option-icon-slot">
                                            {dateRange === option && <Check size={14} />}
                                        </div>
                                        <span>{option}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid-hub">
                {stats.map((stat, index) => (
                    <div key={index} className="hub-stat-card">
                        <div className="stat-top">
                            <span className="stat-label">{stat.label}</span>
                            <stat.icon size={18} className="stat-icon-muted" />
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-sub">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Bottom Sections: Most Viewed Episodes & Series */}
            <div className="dashboard-sections-grid">
                <div className="section-card">
                    <div className="section-header">Most Viewed Episodes</div>
                    {isLoading ? (
                        <div className="empty-state">Loading dashboard data...</div>
                    ) : mostViewedEpisodes.length ? (
                        <div className="section-list">
                            {mostViewedEpisodes.map((episode) => (
                                <div key={episode.id} className="section-list-item">
                                    <div className="section-item-texts">
                                        <div className="section-item-title">{episode.title}</div>
                                        <div className="section-item-subtitle">{episode.subtitle}</div>
                                    </div>
                                    <div className="section-item-metric">
                                        <span className="metric-value">{formatCount(episode.views)}</span>
                                        <span className="metric-label">views</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">No episodes to display for this range.</div>
                    )}
                </div>
                <div className="section-card">
                    <div className="section-header">Most Viewed Series</div>
                    {isLoading ? (
                        <div className="empty-state">Loading dashboard data...</div>
                    ) : mostViewedSeries.length ? (
                        <div className="section-list">
                            {mostViewedSeries.map((series) => (
                                <div key={series.id} className="section-list-item">
                                    <div className="section-item-texts">
                                        <div className="section-item-title">{series.title}</div>
                                        <div className="section-item-subtitle">{series.subtitle}</div>
                                    </div>
                                    <div className="section-item-metric">
                                        <span className="metric-value">{formatCount(series.views)}</span>
                                        <span className="metric-label">views</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">No series to display for this range.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
