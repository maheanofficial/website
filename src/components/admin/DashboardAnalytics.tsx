import { useState, useEffect } from 'react';
import { getStatsForPeriod } from '../../utils/analyticsManager';
import {
    Users, Smartphone, Monitor, Globe,
    TabletSmartphone, ChevronDown, Calendar,
    BookOpen, Hash, Image as ImageIcon, Sparkles, TrendingUp
} from 'lucide-react';
import { getStories } from '../../utils/storyManager';
import { getAllAuthors } from '../../utils/authorManager';
import { getAllCategories } from '../../utils/categoryManager';

const DashboardAnalytics = () => {
    const [period, setPeriod] = useState(28); // default 28 days
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [contentStats, setContentStats] = useState({
        stories: 0,
        authors: 0,
        categories: 0,
        images: 0
    });

    const loadStats = () => {
        const data = getStatsForPeriod(period === 0 ? 3650 : period);
        setStats(data);

        // Load content stats
        const stories = getStories();
        const authors = getAllAuthors();
        const categories = getAllCategories();

        setAllCategories(categories);

        // Count images from stories and authors
        const storyImages = stories.filter(s => s.cover_image).length;
        const authorImages = authors.filter(a => a.avatar).length;
        const categoryImages = categories.filter(c => c.image).length;

        setContentStats({
            stories: stories.length,
            authors: authors.length,
            categories: categories.length,
            images: storyImages + authorImages + categoryImages
        });
    };

    useEffect(() => {
        loadStats();
    }, [period]);

    if (!stats) return <div>Loading...</div>;

    // Calculate percentages
    const totalDevices = stats.devices.mobile + stats.devices.iphone + stats.devices.pc + stats.devices.other;
    const getPercent = (val: number) => totalDevices === 0 ? 0 : Math.round((val / totalDevices) * 100);

    const sortedCountries = Object.entries(stats.countries)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5); // Top 5

    const countryFlags: Record<string, string> = {
        'Bangladesh': 'bd',
        'India': 'in',
        'USA': 'us',
        'UK': 'gb',
        'Pakistan': 'pk',
        'Canada': 'ca',
        'Australia': 'au',
        'Germany': 'de',
        'Japan': 'jp'
    };

    return (
        <div className="admin-section">
            <div className="flex justify-between items-center mb-6">
                <h2 className="admin-section-title">
                    <Sparkles size={24} className="text-orange-400" /> Site Overview
                </h2>
            </div>

            {/* Content Stats Cards - Static */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="admin-card bg-gradient-to-br from-orange-500/20 to-orange-900/20 border-orange-500/30">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <BookOpen size={16} className="text-orange-400" /> Total Stories
                    </div>
                    <div className="text-3xl font-bold text-white">{contentStats.stories}</div>
                    <p className="text-xs text-orange-200/60 mt-2">Published content</p>
                </div>

                <div className="admin-card bg-gradient-to-br from-blue-500/20 to-blue-900/20 border-blue-500/30">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <Users size={16} className="text-blue-400" /> Authors
                    </div>
                    <div className="text-3xl font-bold text-white">{contentStats.authors}</div>
                    <p className="text-xs text-blue-200/60 mt-2">Creative contributors</p>
                </div>

                <div className="admin-card bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border-emerald-500/30">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <Hash size={16} className="text-emerald-400" /> Categories
                    </div>
                    <div className="text-3xl font-bold text-white">{contentStats.categories}</div>
                    <p className="text-xs text-emerald-200/60 mt-2">Organized topics</p>
                </div>

                <div className="admin-card bg-gradient-to-br from-purple-500/20 to-purple-900/20 border-purple-500/30">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <ImageIcon size={16} className="text-purple-400" /> Total Pictures
                    </div>
                    <div className="text-3xl font-bold text-white">{contentStats.images}</div>
                    <p className="text-xs text-purple-200/60 mt-2">Visual assets</p>
                </div>
            </div>

            {/* Visitor Analytics Section - With Period Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-400" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Visitor Analytics</h3>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg transition-all duration-200 shadow-lg min-w-[150px] justify-between group backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-400" />
                            <span className="text-sm font-medium">
                                {period === 0 ? 'All Time' : period === 365 ? 'Last 1 Year' : `Last ${period} Days`}
                            </span>
                        </div>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${isMenuOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden py-1 backdrop-blur-xl">
                                {[
                                    { label: 'Last 7 Days', value: 7 },
                                    { label: 'Last 28 Days', value: 28 },
                                    { label: 'Last 90 Days', value: 90 },
                                    { label: 'Last 1 Year', value: 365 },
                                    { label: 'All Time', value: 0 }
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            setPeriod(item.value);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`
                                            w-full text-left px-4 py-2.5 text-sm transition-all flex items-center gap-3
                                            ${period === item.value
                                                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
                                        `}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Stats Cards (Visitors) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="admin-card bg-gradient-to-br from-indigo-500/20 to-indigo-900/20 border-indigo-500/30">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <Users size={16} /> Total Visitors
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalVisitors.toLocaleString()}</div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <span className="text-xs text-indigo-300">In selected period</span>
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-xs text-indigo-100 font-medium">
                            Today: {stats.todayVisitors.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="admin-card">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <Smartphone size={16} /> Mobile (Android)
                    </div>
                    <div className="text-2xl font-bold text-white">{getPercent(stats.devices.mobile)}%</div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-400 h-full" style={{ width: `${getPercent(stats.devices.mobile)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stats.devices.mobile.toLocaleString()} users</div>
                </div>

                <div className="admin-card">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <TabletSmartphone size={16} /> iPhone / iOS
                    </div>
                    <div className="text-2xl font-bold text-white">{getPercent(stats.devices.iphone)}%</div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-400 h-full" style={{ width: `${getPercent(stats.devices.iphone)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stats.devices.iphone.toLocaleString()} users</div>
                </div>

                <div className="admin-card">
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                        <Monitor size={16} /> Desktop / PC
                    </div>
                    <div className="text-2xl font-bold text-white">{getPercent(stats.devices.pc)}%</div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-orange-400 h-full" style={{ width: `${getPercent(stats.devices.pc)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stats.devices.pc.toLocaleString()} users</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories List */}
                <div className="admin-card">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Hash size={18} className="text-emerald-400" /> Categories List
                        </h3>
                        <span className="text-xs text-gray-500">{allCategories.length} Total</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {allCategories.length > 0 ? (
                            allCategories.map((cat: any) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                                        <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{cat.description || 'No description'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`text-[10px] px-2 py-0.5 rounded ${cat.image ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}>
                                            {cat.image ? 'Image Set' : 'No Image'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 py-4 text-center italic">No categories created yet.</p>
                        )}
                    </div>
                </div>

                {/* Top Countries */}
                <div className="admin-card">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Globe size={18} className="text-indigo-400" /> Top Countries
                        </h3>
                        <span className="text-xs text-gray-500">Visitor counts</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {sortedCountries.length > 0 ? (
                            sortedCountries.map(([country, count]: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between pb-2 border-b border-white/5 last:border-0 w-full">
                                    <div className="flex items-center gap-3">
                                        {countryFlags[country] ? (
                                            <img
                                                src={`https://flagcdn.com/w40/${countryFlags[country]}.png`}
                                                alt={country}
                                                className="w-5 h-auto rounded-[2px] shadow-sm"
                                            />
                                        ) : (
                                            <Globe size={16} className="text-indigo-400" />
                                        )}
                                        <span className="font-medium text-gray-200">{country}</span>
                                    </div>
                                    <div className="flex items-center whitespace-nowrap">
                                        <span className="font-bold text-lg text-white">{count.toLocaleString()}</span>
                                        <span className="text-xs text-gray-400 ml-1.5 mt-1">Visitors</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 py-4 text-center italic">No country data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
