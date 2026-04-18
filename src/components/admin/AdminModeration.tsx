import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { getAllStories, updateStoryStatus, type Story } from '../../utils/storyManager';
import { getReportedComments, resolveCommentReport, type CommentReport } from '../../utils/commentManager';
import './AdminModeration.css';

const toStatus = (value?: string | null) => String(value || '').trim().toLowerCase();

const AdminModeration = () => {
    const [stories, setStories] = useState<Story[]>([]);
    const [reports, setReports] = useState<CommentReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState('');

    const pendingStories = useMemo(
        () => stories.filter((story) => toStatus(story.status) === 'pending'),
        [stories]
    );

    const loadData = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        const [storyRows, reportRows] = await Promise.all([
            getAllStories(),
            getReportedComments().catch(() => [])
        ]);
        setStories(storyRows);
        setReports(reportRows);
        if (showLoader) setIsLoading(false);
    };

    useEffect(() => {
        const initial = window.setTimeout(() => {
            void loadData(true);
        }, 0);
        const interval = window.setInterval(() => {
            void loadData(false);
        }, 20_000);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(interval);
        };
    }, []);

    const handleStoryDecision = async (storyId: string, status: 'published' | 'rejected') => {
        const result = await updateStoryStatus(storyId, status);
        if (!result.success || !result.synced) {
            setFeedback(result.message || 'Story moderation failed.');
            return;
        }
        setFeedback(status === 'published' ? 'Story approved.' : 'Story rejected.');
        setStories((prev) => prev.map((story) => (
            story.id === storyId ? { ...story, status } : story
        )));
    };

    const handleResolveReport = async (reportId: string, options?: { deleteComment?: boolean; dismiss?: boolean }) => {
        try {
            await resolveCommentReport({
                reportId,
                status: options?.dismiss ? 'dismissed' : 'resolved',
                deleteComment: Boolean(options?.deleteComment)
            });
            setReports((prev) => prev.filter((report) => report.id !== reportId));
            if (options?.deleteComment) {
                setFeedback('Report resolved and comment deleted.');
            } else if (options?.dismiss) {
                setFeedback('Report dismissed.');
            } else {
                setFeedback('Report resolved.');
            }
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Failed to resolve report.');
        }
    };

    return (
        <section className="admin-section">
            <h2 className="admin-section-title">
                <ShieldAlert size={20} />
                Moderation Center
            </h2>

            {feedback ? <p className="moderation-feedback">{feedback}</p> : null}

            <div className="admin-card">
                <h3 className="card-title">Pending Story Approvals ({pendingStories.length})</h3>
                {isLoading ? (
                    <p>Loading moderation queue...</p>
                ) : pendingStories.length === 0 ? (
                    <p>No pending stories.</p>
                ) : (
                    <div className="story-list-scroll moderation-list">
                        {pendingStories.map((story) => (
                            <article key={`pending-${story.id}`} className="moderation-item">
                                <div className="moderation-copy">
                                    <h4>{story.title}</h4>
                                    <p>{story.author || 'Unknown author'} • {new Date(story.date).toLocaleDateString()}</p>
                                </div>
                                <div className="moderation-actions">
                                    <button
                                        type="button"
                                        className="icon-btn approve"
                                        onClick={() => void handleStoryDecision(story.id, 'published')}
                                        title="Approve story"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn reject"
                                        onClick={() => void handleStoryDecision(story.id, 'rejected')}
                                        title="Reject story"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="admin-card">
                <h3 className="card-title">Reported Comments ({reports.length})</h3>
                {isLoading ? (
                    <p>Loading reported comments...</p>
                ) : reports.length === 0 ? (
                    <p>No open reports.</p>
                ) : (
                    <div className="story-list-scroll moderation-list">
                        {reports.map((report) => (
                            <article key={report.id} className="moderation-item report">
                                <div className="moderation-copy">
                                    <h4>
                                        <AlertTriangle size={15} />
                                        {report.reason}
                                    </h4>
                                    <p>Story: {report.storySlug || report.storyId}</p>
                                    {report.details ? <p>{report.details}</p> : null}
                                    <small>
                                        Reported by {report.reporterName || 'Reader'} • {new Date(report.createdAt).toLocaleString()}
                                    </small>
                                </div>
                                <div className="moderation-actions vertical">
                                    <button
                                        type="button"
                                        className="icon-btn approve"
                                        onClick={() => void handleResolveReport(report.id)}
                                        title="Mark as resolved"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn reject"
                                        onClick={() => void handleResolveReport(report.id, { dismiss: true })}
                                        title="Dismiss report"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn delete"
                                        onClick={() => void handleResolveReport(report.id, { deleteComment: true })}
                                        title="Delete comment and resolve"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default AdminModeration;
