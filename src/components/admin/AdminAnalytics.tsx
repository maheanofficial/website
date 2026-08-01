import { useState, useEffect } from 'react';
import './AdminAnalytics.css';

interface StatData {
    totalViews: number;
    totalStories: number;
    totalUsers: number;
    todayViews: number;
}

interface Story {
    id: string;
    title: string;
    views?: number;
    createdAt?: string;
}

interface ActivityItem {
    type: 'story' | 'user' | string;
    text: string;
    time: string;
}

export default function AdminAnalytics() {
    const [stats, setStats] = useState<StatData | null>(null);
    const [topStories, setTopStories] = useState<Story[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchAnalytics() {
            try {
                // Fetch data
                const [storiesRes, usersRes] = await Promise.all([
                    fetch('/api/db?action=listStories'),
                    fetch('/api/db?action=listUsers')
                ]);

                if (!storiesRes.ok || !usersRes.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const storiesData = await storiesRes.json();
                const usersData = await usersRes.json();
                
                if (!isMounted) return;

                const stories = storiesData.data || [];
                const users = usersData.data || [];

                // Calculate stats
                const totalViews = stories.reduce((acc: number, s: Story) => acc + (s.views || 0), 0);
                const totalStories = stories.length;
                const totalUsers = users.length;
                
                // Mock today's views for now as we might not have exact date-based views in DB
                const todayViews = Math.floor(totalViews * 0.05); // Simulated 5% of total views

                setStats({
                    totalViews,
                    totalStories,
                    totalUsers,
                    todayViews
                });

                // Get top 5 stories by view
                const sortedStories = [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
                setTopStories(sortedStories);

                // Mock recent activity based on latest users and stories
                const activities = [];
                if (stories.length > 0) {
                    const latestStory = [...stories].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
                    if (latestStory) activities.push({ type: 'story', text: `নতুন গল্প প্রকাশিত হয়েছে: ${latestStory.title}`, time: 'সম্প্রতি' });
                }
                if (users.length > 0) {
                    const latestUser = [...users].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
                    if (latestUser) activities.push({ type: 'user', text: `নতুন ব্যবহারকারী যোগ দিয়েছেন: ${latestUser.name || 'অজানা'}`, time: 'সম্প্রতি' });
                }
                setRecentActivity(activities);

            } catch (err) {
                if (isMounted) setError(err instanceof Error ? err.message : 'অজানা ত্রুটি');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        void fetchAnalytics();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div className="loading-state">ডেটা লোড হচ্ছে...</div>;
    }

    if (error) {
        return <div className="error-state">ত্রুটি: {error}</div>;
    }

    const maxViews = Math.max(...topStories.map(s => s.views || 0), 1);

    return (
        <div className="admin-analytics">
            <div className="analytics-grid">
                <div className="stat-card">
                    <span className="stat-title">মোট ভিউ</span>
                    <span className="stat-value">{stats?.totalViews.toLocaleString('bn-BD') || 0}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">আজকের ভিউ (আনুমানিক)</span>
                    <span className="stat-value">{stats?.todayViews.toLocaleString('bn-BD') || 0}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">মোট গল্প</span>
                    <span className="stat-value">{stats?.totalStories.toLocaleString('bn-BD') || 0}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">মোট ব্যবহারকারী</span>
                    <span className="stat-value">{stats?.totalUsers.toLocaleString('bn-BD') || 0}</span>
                </div>
            </div>

            <div className="charts-section">
                <div className="chart-card">
                    <h3 className="chart-title">জনপ্রিয় ৫টি গল্প</h3>
                    <div className="bar-chart">
                        {topStories.map((story, index) => (
                            <div key={story.id || index} className="bar-row">
                                <div className="bar-label-group">
                                    <span className="bar-label">{story.title}</span>
                                    <span>{(story.views || 0).toLocaleString('bn-BD')} ভিউ</span>
                                </div>
                                <div className="bar-track">
                                    <div 
                                        className="bar-fill" 
                                        style={{ width: `${((story.views || 0) / maxViews) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {topStories.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>কোনো গল্প পাওয়া যায়নি</div>}
                    </div>
                </div>

                <div className="chart-card">
                    <h3 className="chart-title">সাম্প্রতিক কাজ</h3>
                    <div className="activity-list">
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-icon">
                                    {activity.type === 'story' ? '📚' : '👤'}
                                </div>
                                <div className="activity-details">
                                    <span className="activity-text">{activity.text}</span>
                                    <span className="activity-time">{activity.time}</span>
                                </div>
                            </div>
                        ))}
                        {recentActivity.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>কোনো সাম্প্রতিক কাজ নেই</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
