import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Edit2, Eye, Lock, Plus, Search, Unlock } from 'lucide-react';
import './AdminEpisodes.css';
import { getAllStories, updateStoryStatus, type Story } from '../../utils/storyManager';
import type { User } from '../../utils/userManager';

interface AdminEpisodesProps {
    user?: User | null;
}

const AdminEpisodes = ({ user }: AdminEpisodesProps) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const navigate = useNavigate();

    const isAdmin = user?.role === 'admin';

    const loadStories = async () => {
        setIsLoading(true);
        const data = await getAllStories();
        setStories(data);
        setIsLoading(false);
    };

    useEffect(() => {
        void loadStories();
    }, []);

    const handleCreate = () => {
        navigate('/admin/dashboard/series/create');
    };

    const handleView = (story: Story) => {
        const url = `/stories/${story.slug || story.id}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEdit = (story: Story) => {
        navigate(`/admin/dashboard/series/edit/${story.id}`);
    };

    const resolveVisibilityStatus = (status?: Story['status']) => {
        if (!status || status === 'published' || status === 'completed' || status === 'ongoing') {
            return 'published';
        }
        return status;
    };

    const getNextStatus = (story: Story) => {
        const current = resolveVisibilityStatus(story.status);
        if (isAdmin) {
            return current === 'published' ? 'draft' : 'published';
        }
        return current === 'pending' ? 'draft' : 'pending';
    };

    const handleToggleVisibility = async (story: Story) => {
        const nextStatus = getNextStatus(story);
        const result = await updateStoryStatus(story.id, nextStatus);
        if (!result.success || !result.synced) {
            alert(result.message || 'Failed to update story status on server.');
            return;
        }
        setStories(prev => prev.map(item => (item.id === story.id ? { ...item, status: nextStatus } : item)));
    };

    const filteredStories = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const statusValue = statusFilter === 'All'
            ? null
            : statusFilter === 'Public'
                ? 'published'
                : statusFilter === 'Private'
                    ? 'draft'
                    : statusFilter.toLowerCase();

        return stories
            .filter(story => {
                if (isAdmin) return true;
                return story.authorId === user?.id || story.submittedBy === user?.id;
            })
            .filter(story => {
                if (!normalizedQuery) return true;
                const title = story.title?.toLowerCase() || '';
                const category = story.category?.toLowerCase() || '';
                return title.includes(normalizedQuery) || category.includes(normalizedQuery);
            })
            .filter(story => {
                if (!statusValue) return true;
                return resolveVisibilityStatus(story.status) === statusValue;
            });
    }, [stories, searchQuery, statusFilter, isAdmin, user?.id]);

    const getVisibilityLabel = (status?: Story['status']) => {
        const resolved = resolveVisibilityStatus(status);
        if (resolved === 'published') return 'Public';
        if (resolved === 'draft') return 'Private';
        if (resolved === 'pending') return 'Pending';
        if (resolved === 'rejected') return 'Rejected';
        return resolved;
    };

    const getStatusClass = (status?: Story['status']) => resolveVisibilityStatus(status);

    return (
        <div className="admin-episodes-container">
            <div className="episodes-actions-bar">
                <div className="search-filter-group">
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="\u09aa\u09b0\u09cd\u09ac \u0996\u09c1\u0981\u099c\u09c1\u09a8..."
                            className="search-input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="status-dropdown"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Public">Public</option>
                        <option value="Private">Private</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>

                <button className="create-episode-btn" onClick={handleCreate}>
                    <Plus size={18} />
                    \u09a8\u09a4\u09c1\u09a8 \u09aa\u09b0\u09cd\u09ac \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8
                </button>
            </div>

            <div className="data-table-container">
                <div className="data-table-header">
                    <div className="col-header col-title">\u09b6\u09bf\u09b0\u09cb\u09a8\u09be\u09ae <ArrowUpDown size={12} /></div>
                    <div className="col-header col-status">\u09ad\u09bf\u099c\u09bf\u09ac\u09bf\u09b2\u09bf\u099f\u09bf</div>
                    <div className="col-header col-parts">\u09aa\u09b0\u09cd\u09ac</div>
                    <div className="col-header col-created">\u09a4\u09be\u09b0\u09bf\u0996</div>
                    <div className="col-header col-actions">\u098f\u0995\u09b6\u09a8</div>
                </div>

                {isLoading ? (
                    <div className="empty-state-table">
                        <p>\u09b2\u09cb\u09a1 \u09b9\u099a\u09cd\u099b\u09c7...</p>
                    </div>
                ) : filteredStories.length > 0 ? (
                    <div className="table-body">
                        {filteredStories.map(story => {
                            const partsCount = story.parts?.length || 0;
                            const status = resolveVisibilityStatus(story.status);
                            const isPublic = status === 'published';
                            const toggleTitle = isPublic ? 'Make Private' : isAdmin ? 'Make Public' : 'Request Public';
                            return (
                                <div key={story.id} className="data-row">
                                    <div className="col-title cell-text">
                                        <div className="episode-title">{story.title}</div>
                                        <div className="episode-meta">{story.category || 'Uncategorized'}</div>
                                    </div>
                                    <div className="col-status">
                                        <span className={`status-badge status-${getStatusClass(status)}`}>
                                            {getVisibilityLabel(status)}
                                        </span>
                                    </div>
                                    <div className="col-parts cell-text">{partsCount || 1}</div>
                                    <div className="col-created cell-text text-gray-400">
                                        {new Date(story.date).toLocaleDateString()}
                                    </div>
                                    <div className="col-actions flex gap-2 justify-end">
                                        <button className="action-btn" onClick={() => handleView(story)} title="View">
                                            <Eye size={16} />
                                        </button>
                                        <button className="action-btn" onClick={() => handleEdit(story)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn"
                                            onClick={() => void handleToggleVisibility(story)}
                                            title={toggleTitle}
                                        >
                                            {isPublic ? <Lock size={16} /> : <Unlock size={16} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state-table">
                        <p>\u0995\u09cb\u09a8\u09cb \u09aa\u09b0\u09cd\u09ac \u09aa\u09be\u0993\u09df\u09be \u09af\u09be\u09df\u09a8\u09bf\u0964</p>
                        <span className="empty-sub-text">\u098f\u0996\u09a8\u0993 \u0995\u09bf\u099b\u09c1 \u09a4\u09c8\u09b0\u09bf \u09b9\u09df\u09a8\u09bf</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminEpisodes;
