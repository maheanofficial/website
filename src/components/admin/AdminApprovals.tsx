import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getAllStories, updateStoryStatus, type Story } from '../../utils/storyManager';
import './AdminApprovals.css';

const toNormalizedStatus = (value?: string | null) => value?.trim().toLowerCase();

const AdminApprovals = () => {
    const [pendingStories, setPendingStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadPending = async (showLoader = true) => {
        if (showLoader) {
            setIsLoading(true);
        }

        const stories = await getAllStories();
        setPendingStories(stories.filter((story) => toNormalizedStatus(story.status) === 'pending'));

        if (showLoader) {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initialLoadId = window.setTimeout(() => {
            void loadPending(true);
        }, 0);
        const intervalId = window.setInterval(() => {
            void loadPending(false);
        }, 10000);

        return () => {
            window.clearTimeout(initialLoadId);
            window.clearInterval(intervalId);
        };
    }, []);

    const handleApprove = async (storyId: string) => {
        const result = await updateStoryStatus(storyId, 'published');
        if (!result.success || !result.synced) {
            alert(result.message || 'Failed to approve post on server.');
            return;
        }
        setPendingStories(prev => prev.filter(story => story.id !== storyId));
    };

    const handleReject = async (storyId: string) => {
        const result = await updateStoryStatus(storyId, 'rejected');
        if (!result.success || !result.synced) {
            alert(result.message || 'Failed to reject post on server.');
            return;
        }
        setPendingStories(prev => prev.filter(story => story.id !== storyId));
    };

    return (
        <div className="admin-section">
            <h2 className="admin-section-title">
                <CheckCircle size={20} />
                Post Approvals
            </h2>

            <div className="admin-card">
                <h3 className="card-title">Pending Posts ({pendingStories.length})</h3>

                {isLoading ? (
                    <p>Loading pending posts...</p>
                ) : pendingStories.length === 0 ? (
                    <p>No pending posts right now.</p>
                ) : (
                    <div className="story-list-scroll">
                        {pendingStories.map(story => (
                            <div key={story.id} className="list-item">
                                <div className="list-item-info">
                                    <span className="item-name">{story.title}</span>
                                    <span className="item-meta">
                                        {story.author || 'Unknown author'} - {new Date(story.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="approval-actions">
                                    <button
                                        type="button"
                                        className="icon-btn approve"
                                        onClick={() => void handleApprove(story.id)}
                                        title="Approve"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn reject"
                                        onClick={() => void handleReject(story.id)}
                                        title="Reject"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminApprovals;
