import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Bookmark, Clock3, LayoutDashboard, MessageSquare, Save, UserRound, X } from 'lucide-react';
import SEO from '../components/SEO';
import SmartImage from '../components/SmartImage';
import { buildAuthPageLink } from '../utils/authRedirect';
import { getCurrentUser, onAuthStateChange, updateCurrentUserProfile } from '../utils/auth';
import { getMyStoryComments, type StoryComment } from '../utils/commentManager';
import {
    getReaderBookmarks,
    getReaderHistory,
    getReaderSession,
    removeReaderBookmark,
    type ReaderActivityItem,
    type ReaderBookmark,
    type ReaderSession
} from '../utils/readerExperience';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import type { User } from '../utils/userManager';
import './ProfilePage.css';

const trimValue = (value: unknown) => String(value || '').trim();

const formatDashboardDate = (value?: string) => {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) {
        return 'Recently';
    }

    try {
        return new Intl.DateTimeFormat('en-BD', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(parsed);
    } catch {
        return parsed.toLocaleString();
    }
};

const shortenText = (value: string, maxLength: number) => {
    const compact = trimValue(value).replace(/\s+/g, ' ');
    if (!compact) return '';
    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, maxLength).trimEnd()}...`;
};

const buildStoryPath = (input: {
    storyId?: string;
    storySlug?: string;
    partNumber?: number | null;
    fallbackPath?: string;
}) => {
    const fallbackPath = trimValue(input.fallbackPath);
    if (fallbackPath) {
        return fallbackPath;
    }

    const storySegment = trimValue(input.storySlug) || trimValue(input.storyId);
    if (!storySegment) {
        return '/stories';
    }

    const partNumber = Number(input.partNumber);
    if (Number.isFinite(partNumber) && partNumber > 0) {
        return `/stories/${storySegment}/${partNumber}`;
    }

    return `/stories/${storySegment}`;
};

const buildStoryIndexes = (stories: Story[]) => {
    const idIndex = new Map<string, Story>();
    const slugIndex = new Map<string, Story>();

    for (const story of stories) {
        const id = trimValue(story.id);
        const slug = trimValue(story.slug);
        if (id && !idIndex.has(id)) {
            idIndex.set(id, story);
        }
        if (slug && !slugIndex.has(slug)) {
            slugIndex.set(slug, story);
        }
    }

    return {
        idIndex,
        slugIndex
    };
};

const resolveStory = (
    indexes: ReturnType<typeof buildStoryIndexes>,
    storyId?: string,
    storySlug?: string
) => {
    const normalizedSlug = trimValue(storySlug);
    if (normalizedSlug && indexes.slugIndex.has(normalizedSlug)) {
        return indexes.slugIndex.get(normalizedSlug) || null;
    }

    const normalizedId = trimValue(storyId);
    if (normalizedId && indexes.idIndex.has(normalizedId)) {
        return indexes.idIndex.get(normalizedId) || null;
    }

    return null;
};

const ProfilePage = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [myComments, setMyComments] = useState<StoryComment[]>([]);
    const [readerHistory, setReaderHistory] = useState<ReaderActivityItem[]>([]);
    const [readerBookmarks, setReaderBookmarks] = useState<ReaderBookmark[]>([]);
    const [activeSession, setActiveSession] = useState<ReaderSession | null>(() => getReaderSession());
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const syncUser = async () => {
            const user = await getCurrentUser();
            if (!isMounted) return;
            setCurrentUser(user);
            setDisplayName(user?.displayName || '');
            setUsername(user?.username || '');
            setPhotoURL(user?.photoURL || '');
            setIsLoading(false);
        };

        void syncUser();

        const subscription = onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            const user = session?.user ?? null;
            setCurrentUser(user);
            setDisplayName(user?.displayName || '');
            setUsername(user?.username || '');
            setPhotoURL(user?.photoURL || '');
            setStatus(null);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
            subscription?.unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (!currentUser?.id) {
            setReaderHistory([]);
            setReaderBookmarks([]);
            setMyComments([]);
            setActiveSession(getReaderSession());
            setDashboardError('');
            setIsDashboardLoading(false);
            return () => {
                isMounted = false;
            };
        }

        setReaderHistory(getReaderHistory(currentUser.id));
        setReaderBookmarks(getReaderBookmarks(currentUser.id));
        setActiveSession(getReaderSession());
        setDashboardError('');
        setIsDashboardLoading(true);

        const loadDashboard = async () => {
            let loadError = '';

            const [nextStories, nextComments] = await Promise.all([
                getStories().catch(() => getCachedStories()),
                getMyStoryComments().catch((error) => {
                    loadError = error instanceof Error ? error.message : 'Some reader activity is unavailable right now.';
                    return [];
                })
            ]);

            if (!isMounted) {
                return;
            }

            setStories(nextStories);
            setMyComments(nextComments);
            setReaderHistory(getReaderHistory(currentUser.id));
            setReaderBookmarks(getReaderBookmarks(currentUser.id));
            setActiveSession(getReaderSession());
            setDashboardError(loadError);
            setIsDashboardLoading(false);
        };

        void loadDashboard();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id]);

    if (isLoading) {
        return (
            <div className="profile-page page-offset">
                <div className="container">
                    <div className="profile-shell">
                        <div className="profile-loading-card">Loading your reader dashboard...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to={buildAuthPageLink('/login', '/profile', '/profile')} replace />;
    }

    const storyIndexes = buildStoryIndexes(stories);
    const isStaff = currentUser.role === 'admin' || currentUser.role === 'moderator';
    const avatarAlt = displayName || currentUser.email || currentUser.username || 'Profile';
    const readerName = displayName || currentUser.displayName || currentUser.username || currentUser.email || 'Reader';
    const recentHistory = readerHistory.slice(0, 5);
    const recentBookmarks = readerBookmarks.slice(0, 6);
    const recentComments = myComments.slice(0, 6);
    const scopedActiveSession = activeSession && readerHistory.some((entry) => entry.storyId === activeSession.storyId)
        ? activeSession
        : null;
    const currentSessionStory = scopedActiveSession
        ? resolveStory(storyIndexes, scopedActiveSession.storyId, scopedActiveSession.storySlug)
        : null;
    const continueReadingPath = scopedActiveSession
        ? buildStoryPath({
            storyId: scopedActiveSession.storyId,
            storySlug: scopedActiveSession.storySlug || currentSessionStory?.slug,
            fallbackPath: scopedActiveSession.path
        })
        : '';

    const handleRemoveBookmark = (storyId: string) => {
        if (!currentUser?.id) return;
        const nextBookmarks = removeReaderBookmark(currentUser.id, storyId);
        setReaderBookmarks(nextBookmarks);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaving(true);
        setStatus(null);

        try {
            const updatedUser = await updateCurrentUserProfile({
                displayName: displayName.trim(),
                username: username.trim(),
                photoURL: photoURL.trim()
            });
            setCurrentUser(updatedUser);
            setDisplayName(updatedUser.displayName || '');
            setUsername(updatedUser.username || '');
            setPhotoURL(updatedUser.photoURL || '');
            setStatus({ type: 'success', message: 'Profile updated successfully.' });
        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : 'Profile update failed.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="profile-page page-offset">
            <SEO
                title="Reader Dashboard | Mahean Ahmed"
                description="Track your recent reading, bookmarks, comments, and keep your reader profile updated."
                canonicalUrl="/profile"
                noIndex
                noFollow
            />

            <div className="container">
                <div className="profile-shell">
                    <section className="profile-overview">
                        <div className="profile-overview-main">
                            <div className="profile-avatar-column">
                                <div className="profile-avatar-frame">
                                    <SmartImage
                                        src={photoURL || currentUser.photoURL}
                                        alt={avatarAlt}
                                        isRound={true}
                                        showFullText={true}
                                    />
                                </div>
                                <span className="profile-role-pill">
                                    <UserRound size={14} />
                                    {isStaff ? 'Staff account' : 'Reader account'}
                                </span>
                            </div>

                            <div className="profile-copy">
                                <span className="profile-kicker">Reader Dashboard</span>
                                <h1>{readerName}</h1>
                                <p>
                                    Keep track of what you read, what you saved, and every conversation you leave under stories.
                                    This page is now your reading home base.
                                </p>
                                <div className="profile-quick-actions">
                                    <span>{currentUser.email || 'No email connected'}</span>
                                    <span>@{username || currentUser.username || 'reader'}</span>
                                    {isStaff ? (
                                        <Link to="/admin/dashboard" className="profile-admin-link">
                                            <LayoutDashboard size={14} />
                                            Open dashboard
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {scopedActiveSession ? (
                            <div className="profile-session-card">
                                <span className="profile-panel-kicker">Continue reading</span>
                                <h2>{scopedActiveSession.storyTitle}</h2>
                                <p>
                                    {scopedActiveSession.partLabel}
                                    <span className="profile-session-separator">.</span>
                                    {Math.max(0, Math.round(scopedActiveSession.progress))}% completed
                                </p>
                                <div className="profile-session-meta">
                                    <span>{formatDashboardDate(scopedActiveSession.updatedAt)}</span>
                                    <Link to={continueReadingPath} className="profile-session-action">
                                        <BookOpen size={15} />
                                        Jump back in
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="profile-session-card empty">
                                <span className="profile-panel-kicker">Continue reading</span>
                                <h2>No active reading session yet</h2>
                                <p>Start any story and your latest reading position will appear here automatically.</p>
                            </div>
                        )}
                    </section>

                    <section className="profile-stats-grid" aria-label="Reader activity summary">
                        <article className="profile-stat-card">
                            <span className="profile-stat-icon">
                                <Clock3 size={18} />
                            </span>
                            <strong>{readerHistory.length}</strong>
                            <span>Stories tracked</span>
                        </article>
                        <article className="profile-stat-card">
                            <span className="profile-stat-icon">
                                <Bookmark size={18} />
                            </span>
                            <strong>{readerBookmarks.length}</strong>
                            <span>Saved stories</span>
                        </article>
                        <article className="profile-stat-card">
                            <span className="profile-stat-icon">
                                <MessageSquare size={18} />
                            </span>
                            <strong>{myComments.length}</strong>
                            <span>Comments posted</span>
                        </article>
                    </section>

                    {dashboardError ? (
                        <div className="profile-inline-status error">
                            {dashboardError}
                        </div>
                    ) : null}

                    <div className="profile-dashboard-grid">
                        <section className="profile-panel">
                            <div className="profile-panel-head">
                                <div>
                                    <span className="profile-panel-kicker">Reading history</span>
                                    <h2>Recently opened stories</h2>
                                </div>
                                <span className="profile-panel-count">{readerHistory.length}</span>
                            </div>

                            {recentHistory.length > 0 ? (
                                <div className="profile-list">
                                    {recentHistory.map((entry) => {
                                        const story = resolveStory(storyIndexes, entry.storyId, entry.storySlug);
                                        const storyPath = buildStoryPath({
                                            storyId: entry.storyId,
                                            storySlug: entry.storySlug || story?.slug,
                                            fallbackPath: entry.path
                                        });

                                        return (
                                            <article key={`${entry.storyId}-${entry.updatedAt}`} className="profile-activity-item">
                                                <SmartImage
                                                    src={entry.coverImage || story?.cover_image || story?.image}
                                                    alt={entry.storyTitle}
                                                    className="profile-activity-cover"
                                                />
                                                <div className="profile-activity-body">
                                                    <div className="profile-activity-top">
                                                        <h3>{entry.storyTitle}</h3>
                                                        <span>{Math.max(0, Math.round(entry.progress))}%</span>
                                                    </div>
                                                    <p>{entry.partLabel}</p>
                                                    <div className="profile-activity-meta">
                                                        <span>{formatDashboardDate(entry.updatedAt)}</span>
                                                        <Link to={storyPath} className="profile-activity-link">
                                                            Continue
                                                        </Link>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="profile-empty">
                                    Your reading history will appear here after you open a story.
                                </div>
                            )}
                        </section>

                        <section className="profile-panel">
                            <div className="profile-panel-head">
                                <div>
                                    <span className="profile-panel-kicker">Bookmarks</span>
                                    <h2>Saved for later</h2>
                                </div>
                                <span className="profile-panel-count">{readerBookmarks.length}</span>
                            </div>

                            {recentBookmarks.length > 0 ? (
                                <div className="profile-list">
                                    {recentBookmarks.map((entry) => {
                                        const story = resolveStory(storyIndexes, entry.storyId, entry.storySlug);
                                        const storyPath = buildStoryPath({
                                            storyId: entry.storyId,
                                            storySlug: entry.storySlug || story?.slug,
                                            fallbackPath: entry.path
                                        });

                                        return (
                                            <article key={`${entry.storyId}-${entry.savedAt}`} className="profile-activity-item">
                                                <SmartImage
                                                    src={entry.coverImage || story?.cover_image || story?.image}
                                                    alt={entry.storyTitle}
                                                    className="profile-activity-cover"
                                                />
                                                <div className="profile-activity-body">
                                                    <div className="profile-activity-top">
                                                        <h3>{entry.storyTitle}</h3>
                                                        <button
                                                            type="button"
                                                            className="profile-inline-action danger"
                                                            onClick={() => handleRemoveBookmark(entry.storyId)}
                                                            aria-label={`Remove ${entry.storyTitle} bookmark`}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <p>{entry.partLabel}</p>
                                                    <div className="profile-activity-meta">
                                                        <span>{formatDashboardDate(entry.savedAt)}</span>
                                                        <Link to={storyPath} className="profile-activity-link">
                                                            Open story
                                                        </Link>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="profile-empty">
                                    Use the save button inside any story to pin it here.
                                </div>
                            )}
                        </section>

                        <section className="profile-panel profile-panel-wide">
                            <div className="profile-panel-head">
                                <div>
                                    <span className="profile-panel-kicker">Your comments</span>
                                    <h2>Latest discussion</h2>
                                </div>
                                <span className="profile-panel-count">{myComments.length}</span>
                            </div>

                            {recentComments.length > 0 ? (
                                <div className="profile-comments-list">
                                    {recentComments.map((comment) => {
                                        const story = resolveStory(storyIndexes, comment.storyId, comment.storySlug);
                                        const storyTitle = story?.title || comment.storySlug || `Story ${comment.storyId}`;
                                        const storyPath = buildStoryPath({
                                            storyId: comment.storyId,
                                            storySlug: comment.storySlug || story?.slug,
                                            partNumber: comment.partNumber
                                        });
                                        const hasBeenEdited = Boolean(comment.updatedAt && comment.updatedAt !== comment.createdAt);

                                        return (
                                            <article key={comment.id} className="profile-comment-card">
                                                <div className="profile-comment-head">
                                                    <div>
                                                        <strong>{storyTitle}</strong>
                                                        <span>
                                                            {comment.partNumber ? `Part ${comment.partNumber}` : 'Story comment'}
                                                            {hasBeenEdited ? ' . Edited' : ''}
                                                        </span>
                                                    </div>
                                                    <Link to={storyPath} className="profile-activity-link">
                                                        View
                                                    </Link>
                                                </div>
                                                <p className="profile-comment-content">{shortenText(comment.content, 220)}</p>
                                                <div className="profile-activity-meta">
                                                    <span>{formatDashboardDate(comment.updatedAt || comment.createdAt)}</span>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="profile-empty">
                                    Your comments will show up here after you join a story discussion.
                                </div>
                            )}
                        </section>

                        <section className="profile-panel">
                            <div className="profile-panel-head">
                                <div>
                                    <span className="profile-panel-kicker">Edit profile</span>
                                    <h2>Public reader details</h2>
                                </div>
                                {isDashboardLoading ? (
                                    <span className="profile-panel-loading">Syncing...</span>
                                ) : null}
                            </div>

                            <form className="profile-form" onSubmit={handleSubmit}>
                                <label className="profile-field">
                                    <span>Display name</span>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(event) => setDisplayName(event.target.value)}
                                        maxLength={80}
                                        placeholder="Your display name"
                                    />
                                </label>

                                <label className="profile-field">
                                    <span>Username</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        maxLength={120}
                                        placeholder="reader-name"
                                    />
                                </label>

                                <label className="profile-field">
                                    <span>Profile photo URL</span>
                                    <input
                                        type="url"
                                        value={photoURL}
                                        onChange={(event) => setPhotoURL(event.target.value)}
                                        placeholder="https://..."
                                    />
                                </label>

                                <div className="profile-readonly-grid">
                                    <div className="profile-readonly-item">
                                        <span>Email</span>
                                        <strong>{currentUser.email || '-'}</strong>
                                    </div>
                                    <div className="profile-readonly-item">
                                        <span>Role</span>
                                        <strong>{currentUser.role}</strong>
                                    </div>
                                </div>

                                <button type="submit" className="profile-save-btn" disabled={isSaving}>
                                    <Save size={16} />
                                    <span>{isSaving ? 'Saving...' : 'Save changes'}</span>
                                </button>

                                {status ? (
                                    <div className={`profile-inline-status ${status.type === 'error' ? 'error' : ''}`}>
                                        {status.message}
                                    </div>
                                ) : null}
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
