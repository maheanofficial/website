import { useState } from 'react';
import { Plus, ArrowUpDown, ChevronDown, ListFilter } from 'lucide-react';
import './AdminEpisodes.css';

const AdminEpisodes = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [seriesFilter, setSeriesFilter] = useState('');

    return (
        <div className="admin-episodes-container">
            {/* Action Bar */}
            <div className="episodes-actions-bar">
                <div className="search-filter-group">
                    <div className="search-wrapper">
                        <input
                            type="text"
                            placeholder="গল্প খুঁজুন..."
                            className="search-input-flat"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative custom-select-wrapper min-w-[180px]">
                        <ListFilter className="select-icon-left" size={14} />
                        <select
                            className="form-select-flat has-left-icon"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">সমস্ত স্ট্যাটাস</option>
                            <option value="active">অ্যাক্টিভ</option>
                            <option value="pending">অপেক্ষমাণ</option>
                            <option value="cancelled">বাতিল</option>
                            <option value="draft">ড্রাফট</option>
                        </select>
                        <ChevronDown className="select-arrow" size={14} />
                    </div>

                    {/* Series Filter */}
                    <div className="relative custom-select-wrapper min-w-[180px]">
                        <ListFilter className="select-icon-left" size={14} />
                        <select
                            className="form-select-flat has-left-icon"
                            value={seriesFilter}
                            onChange={e => setSeriesFilter(e.target.value)}
                        >
                            <option value="">সমস্ত সিরিজ</option>
                        </select>
                        <ChevronDown className="select-arrow" size={14} />
                    </div>
                </div>

                <button className="create-episode-btn">
                    <Plus size={16} />
                    নতুন পর্ব যোগ করুন
                </button>
            </div>

            {/* Data Table */}
            <div className="data-table-container">
                <div className="data-table-header">
                    <div className="col-header flex-[1.5]">সিরিজসমূহ</div>
                    <div className="col-header flex-[2]">টাইটেল <ArrowUpDown size={12} /></div>
                    <div className="col-header flex-[0.8]">ভিউ</div>
                    <div className="col-header flex-[0.8]">মন্তব্য</div>
                    <div className="col-header flex-1">স্ট্যাটাস <ArrowUpDown size={12} /></div>
                    <div className="col-header flex-[1.2]">তৈরি হয়েছে <ArrowUpDown size={12} /></div>
                    <div className="col-header flex-[1.2]">আপডেট হয়েছে <ArrowUpDown size={12} /></div>
                    <div className="col-header flex-[0.8] justify-end">অ্যাকশনসমূহ</div>
                </div>

                <div className="table-body">
                    <div className="empty-state-row-main">
                        <p className="empty-main-text">No results found.</p>
                    </div>
                    <div className="empty-state-row-sub">
                        <span className="empty-sub-text">No episodes available.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminEpisodes;
