import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getAllStories, updateStoryStatus, type Story } from '../../utils/storyManager';
import './AdminApprovals.css';

const AdminApprovals = () => {
    const [pendingStories, setPendingStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadPending = async () => {
        setIsLoading(true);
        const stories = await getAllStories();
        setPendingStories(stories.filter(story => story.status === 'pending'));
        setIsLoading(false);
    };

    useEffect(() => {
        void loadPending();
    }, []);

    const handleApprove = async (storyId: string) => {
        await updateStoryStatus(storyId, 'published');
        setPendingStories(prev => prev.filter(story => story.id !== storyId));
    };

    const handleReject = async (storyId: string) => {
        await updateStoryStatus(storyId, 'rejected');
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

