import { useState } from 'react';
import { TrendingUp, BookOpen, FileText, Eye, MessageSquare, Calendar, ChevronDown, Check } from 'lucide-react';
import './DashboardAnalytics.css';

const DashboardAnalytics = () => {
    const [dateRange, setDateRange] = useState('Last 7 Days');
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

    const dateOptions = [
        'Last 24 Hours',
        'Last 7 Days',
        'Last 30 Days',
        'Last 3 Months',
        'All Time'
    ];

    // Static data matching the visual style of GolpoHub
    const stats = [
        { label: 'New Episodes', value: '0', sub: 'out of 0 total', icon: FileText },
        { label: 'New Series', value: '0', sub: 'out of 0 total', icon: BookOpen },
        { label: 'Total Views', value: '0', sub: dateRange, icon: Eye },
        { label: 'Total Comments', value: '0', sub: dateRange, icon: MessageSquare },
        { label: 'Avg. Views/Episode', value: '0', sub: dateRange, icon: TrendingUp },
        { label: 'Avg. Comments/Episode', value: '0', sub: dateRange, icon: MessageSquare },
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
                                {dateOptions.map(option => (
                                    <button
                                        key={option}
                                        className={`date-option ${dateRange === option ? 'selected' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDateRange(option);
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
                    <div className="empty-state">
                        No episodes to display.
                    </div>
                </div>
                <div className="section-card">
                    <div className="section-header">Most Viewed Series</div>
                    <div className="empty-state">
                        No series to display.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
