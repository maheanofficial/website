import { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    PlusCircle,
    BarChart2,
    User as UserIcon,
    LogOut,
    ChevronRight,
    Edit3,
    Trash2,
    Eye,
    CheckCircle,
    Clock,
    FileText,
    ArrowLeft,
    Save,
    X
} from 'lucide-react';
import { getCurrentUser, onAuthStateChange, signOut } from '../utils/auth';
import { buildAuthPageLink } from '../utils/authRedirect';
import { toBanglaNumber } from '../utils/numberFormatter';
import { formatLongDate } from '../utils/dateFormatter';
import type { User } from '../utils/userManager';
import './AuthorPortalPage.css';

type AuthorStory = {
    id: string;
    title: string;
    excerpt: string;
    category: string;
    cover_image: string;
    tags: string[];
    parts: { id?: string; title: string; content: string }[];
    views: number;
    comments: number;
    status: string;
    date: string;
    slug: string;
};

type AnalyticsData = {
    totalViews: number;
    totalComments: number;
    totalStories: number;
    publishedStories: number;
    pendingStories: number;
    draftStories: number;
    topStories: { id: string; title: string; views: number; comments: number; status: string; date: string }[];
};

const STATUS_LABELS: Record<string, string> = {
    published: 'প্রকাশিত',
    pending: 'পর্যালোচনায়',
    draft: 'খসড়া',
    rejected: 'প্রত্যাখ্যাত'
};

const STATUS_COLORS: Record<string, string> = {
    published: 'status-published',
    pending: 'status-pending',
    draft: 'status-draft',
    rejected: 'status-rejected'
};

const apiFetch = async (path: string, options?: RequestInit) => {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...((options?.headers as Record<string, string>) || {}) },
        ...options
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
    }
    return res.json();
};

// ── Dashboard overview ─────────────────────────────────────────────────────────
const PortalDashboard = ({ user }: { user: User }) => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/api/author-portal/analytics')
            .then((data) => setAnalytics(data as AnalyticsData))
            .catch(() => setAnalytics(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="portal-loading">লোড হচ্ছে...</div>;

    return (
        <div className="portal-dashboard">
            <div className="portal-welcome">
                <h1>স্বাগতম, {user.displayName || user.username}!</h1>
                <p>আপনার লেখার জগতে স্বাগতম। নতুন গল্প লিখুন বা পুরনো গল্প সম্পাদনা করুন।</p>
            </div>

            {analytics && (
                <div className="portal-stats-grid">
                    <div className="portal-stat-card">
                        <Eye size={24} />
                        <div>
                            <span className="portal-stat-num">{toBanglaNumber(analytics.totalViews)}</span>
                            <span className="portal-stat-label">মোট পাঠক</span>
                        </div>
                    </div>
                    <div className="portal-stat-card">
                        <BookOpen size={24} />
                        <div>
                            <span className="portal-stat-num">{toBanglaNumber(analytics.totalStories)}</span>
                            <span className="portal-stat-label">মোট গল্প</span>
                        </div>
                    </div>
                    <div className="portal-stat-card">
                        <CheckCircle size={24} />
                        <div>
                            <span className="portal-stat-num">{toBanglaNumber(analytics.publishedStories)}</span>
                            <span className="portal-stat-label">প্রকাশিত</span>
                        </div>
                    </div>
                    <div className="portal-stat-card">
                        <Clock size={24} />
                        <div>
                            <span className="portal-stat-num">{toBanglaNumber(analytics.pendingStories)}</span>
                            <span className="portal-stat-label">পর্যালোচনায়</span>
                        </div>
                    </div>
                </div>
            )}

            {analytics?.topStories && analytics.topStories.length > 0 && (
                <div className="portal-top-stories">
                    <h2>সেরা গল্প</h2>
                    <div className="portal-top-list">
                        {analytics.topStories.map((s) => (
                            <div key={s.id} className="portal-top-item">
                                <span className="portal-top-title">{s.title}</span>
                                <span className={`portal-status-badge ${STATUS_COLORS[s.status] || 'status-draft'}`}>
                                    {STATUS_LABELS[s.status] || s.status}
                                </span>
                                <span className="portal-top-views">
                                    <Eye size={14} /> {toBanglaNumber(s.views)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="portal-quick-actions">
                <Link to="/author-portal/new-story" className="portal-quick-btn primary">
                    <PlusCircle size={18} />
                    <span>নতুন গল্প লিখুন</span>
                </Link>
                <Link to="/author-portal/my-stories" className="portal-quick-btn">
                    <BookOpen size={18} />
                    <span>আমার গল্পগুলো</span>
                </Link>
            </div>
        </div>
    );
};

// ── My Stories list ────────────────────────────────────────────────────────────
const MyStories = () => {
    const [stories, setStories] = useState<AuthorStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const load = () => {
        setLoading(true);
        apiFetch('/api/author-portal/stories')
            .then((data) => setStories((data as { stories: AuthorStory[] }).stories || []))
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`"${title}" গল্পটি মুছে দেবেন?`)) return;
        try {
            await apiFetch(`/api/author-portal/stories/${id}`, { method: 'DELETE' });
            setStories((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            alert((err as Error).message);
        }
    };

    if (loading) return <div className="portal-loading">গল্প লোড হচ্ছে...</div>;
    if (error) return <div className="portal-error">{error}</div>;

    return (
        <div className="portal-my-stories">
            <div className="portal-section-header">
                <h2>আমার গল্পগুলো</h2>
                <Link to="/author-portal/new-story" className="portal-btn-sm primary">
                    <PlusCircle size={16} /> নতুন গল্প
                </Link>
            </div>

            {stories.length === 0 ? (
                <div className="portal-empty">
                    <FileText size={48} />
                    <p>এখনো কোনো গল্প লেখা হয়নি।</p>
                    <Link to="/author-portal/new-story" className="portal-quick-btn primary">নতুন গল্প লিখুন</Link>
                </div>
            ) : (
                <div className="portal-stories-list">
                    {stories.map((s) => (
                        <div key={s.id} className="portal-story-row">
                            <div className="portal-story-info">
                                <h3>{s.title}</h3>
                                <div className="portal-story-meta">
                                    <span className={`portal-status-badge ${STATUS_COLORS[s.status] || 'status-draft'}`}>
                                        {STATUS_LABELS[s.status] || s.status}
                                    </span>
                                    <span><Eye size={14} /> {toBanglaNumber(s.views)}</span>
                                    <span>{formatLongDate(s.date)}</span>
                                </div>
                            </div>
                            <div className="portal-story-actions">
                                <button
                                    className="portal-icon-btn"
                                    onClick={() => navigate(`/author-portal/edit/${s.id}`)}
                                    title="সম্পাদনা"
                                >
                                    <Edit3 size={16} />
                                </button>
                                {s.status === 'published' && s.slug && (
                                    <Link
                                        to={`/stories/${s.slug}`}
                                        className="portal-icon-btn"
                                        title="দেখুন"
                                        target="_blank"
                                    >
                                        <Eye size={16} />
                                    </Link>
                                )}
                                <button
                                    className="portal-icon-btn danger"
                                    onClick={() => void handleDelete(s.id, s.title)}
                                    title="মুছুন"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Story Editor ───────────────────────────────────────────────────────────────
const StoryEditor = ({ editId }: { editId?: string }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!!editId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [activePart, setActivePart] = useState(0);

    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [category, setCategory] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [tagsRaw, setTagsRaw] = useState('');
    const [, setStatus] = useState<'draft' | 'pending'>('draft');
    const [parts, setParts] = useState([{ id: '', title: 'পর্ব ০১', content: '' }]);

    useEffect(() => {
        if (!editId) return;
        apiFetch('/api/author-portal/stories')
            .then((data) => {
                const story = ((data as { stories: AuthorStory[] }).stories || []).find((s) => s.id === editId);
                if (!story) throw new Error('গল্পটি পাওয়া যায়নি।');
                setTitle(story.title);
                setExcerpt(story.excerpt);
                setCategory(story.category);
                setCoverImage(story.cover_image);
                setTagsRaw((story.tags || []).join(', '));
                setStatus(story.status === 'pending' ? 'pending' : 'draft');
                setParts(story.parts?.length ? story.parts.map((p) => ({ id: p.id || '', title: p.title, content: p.content })) : [{ id: '', title: 'পর্ব ০১', content: '' }]);
            })
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [editId]);

    const addPart = () => {
        setParts((prev) => [...prev, { id: '', title: `পর্ব ${String(prev.length + 1).padStart(2, '0')}`, content: '' }]);
        setActivePart(parts.length);
    };

    const removePart = (idx: number) => {
        if (parts.length === 1) return;
        setParts((prev) => prev.filter((_, i) => i !== idx));
        setActivePart(Math.max(0, activePart - 1));
    };

    const updatePart = (idx: number, field: 'title' | 'content', value: string) => {
        setParts((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    const handleSave = async (submitStatus: 'draft' | 'pending') => {
        if (!title.trim()) { setError('গল্পের শিরোনাম দিন।'); return; }
        if (!parts[0].content.trim()) { setError('অন্তত একটি পর্বের বিষয়বস্তু দিন।'); return; }

        setSaving(true);
        setError('');

        const payload = {
            title: title.trim(),
            excerpt: excerpt.trim(),
            category: category.trim(),
            cover_image: coverImage.trim(),
            tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
            parts: parts.map((p) => ({ id: p.id || undefined, title: p.title.trim(), content: p.content })),
            status: submitStatus
        };

        try {
            if (editId) {
                await apiFetch(`/api/author-portal/stories/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await apiFetch('/api/author-portal/stories', { method: 'POST', body: JSON.stringify(payload) });
            }
            navigate('/author-portal/my-stories');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="portal-loading">লোড হচ্ছে...</div>;

    return (
        <div className="portal-story-editor">
            <div className="portal-editor-header">
                <button className="portal-back-btn" onClick={() => navigate('/author-portal/my-stories')}>
                    <ArrowLeft size={18} /> ফিরে যান
                </button>
                <h2>{editId ? 'গল্প সম্পাদনা' : 'নতুন গল্প'}</h2>
                <div className="portal-editor-actions">
                    <button className="portal-btn-sm" onClick={() => void handleSave('draft')} disabled={saving}>
                        <Save size={16} /> {saving ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ'}
                    </button>
                    <button className="portal-btn-sm primary" onClick={() => void handleSave('pending')} disabled={saving}>
                        <CheckCircle size={16} /> প্রকাশের জন্য পাঠান
                    </button>
                </div>
            </div>

            {error && <div className="portal-error">{error}</div>}

            <div className="portal-editor-body">
                <div className="portal-editor-meta">
                    <div className="portal-field">
                        <label>শিরোনাম *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="গল্পের শিরোনাম লিখুন..."
                            maxLength={300}
                        />
                    </div>
                    <div className="portal-field">
                        <label>সারসংক্ষেপ</label>
                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="গল্পের সংক্ষিপ্ত বিবরণ..."
                            rows={3}
                            maxLength={1000}
                        />
                    </div>
                    <div className="portal-field-row">
                        <div className="portal-field">
                            <label>ক্যাটাগরি</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="যেমন: রোমান্স, থ্রিলার..."
                            />
                        </div>
                        <div className="portal-field">
                            <label>ট্যাগ (কমা দিয়ে আলাদা করুন)</label>
                            <input
                                type="text"
                                value={tagsRaw}
                                onChange={(e) => setTagsRaw(e.target.value)}
                                placeholder="ভালোবাসা, রহস্য, অ্যাডভেঞ্চার..."
                            />
                        </div>
                    </div>
                    <div className="portal-field">
                        <label>কভার ছবির URL</label>
                        <input
                            type="text"
                            value={coverImage}
                            onChange={(e) => setCoverImage(e.target.value)}
                            placeholder="https://..."
                        />
                    </div>
                </div>

                <div className="portal-editor-parts">
                    <div className="portal-parts-tabs">
                        {parts.map((p, idx) => (
                            <div key={idx} className={`portal-part-tab ${idx === activePart ? 'active' : ''}`}>
                                <button onClick={() => setActivePart(idx)}>{p.title || `পর্ব ${idx + 1}`}</button>
                                {parts.length > 1 && (
                                    <button className="portal-part-remove" onClick={() => removePart(idx)}>
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button className="portal-add-part-btn" onClick={addPart}>
                            <PlusCircle size={16} /> পর্ব যোগ
                        </button>
                    </div>

                    {parts[activePart] && (
                        <div className="portal-part-editor">
                            <input
                                type="text"
                                className="portal-part-title-input"
                                value={parts[activePart].title}
                                onChange={(e) => updatePart(activePart, 'title', e.target.value)}
                                placeholder="পর্বের শিরোনাম..."
                            />
                            <textarea
                                className="portal-part-content"
                                value={parts[activePart].content}
                                onChange={(e) => updatePart(activePart, 'content', e.target.value)}
                                placeholder="এখানে গল্প লিখুন...

** পুরু অক্ষরে লিখতে **এভাবে** করুন
* হেলানো লেখার জন্য *এভাবে* করুন
> উদ্ধৃতির জন্য > ব্যবহার করুন"
                                rows={25}
                            />
                            <div className="portal-part-stats">
                                {toBanglaNumber(parts[activePart].content.length)} অক্ষর
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Analytics page ─────────────────────────────────────────────────────────────
const PortalAnalytics = () => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/api/author-portal/analytics')
            .then((data) => setAnalytics(data as AnalyticsData))
            .catch(() => setAnalytics(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="portal-loading">লোড হচ্ছে...</div>;
    if (!analytics) return <div className="portal-error">Analytics লোড করতে সমস্যা হয়েছে।</div>;

    return (
        <div className="portal-analytics">
            <h2>Analytics</h2>

            <div className="portal-stats-grid">
                <div className="portal-stat-card">
                    <Eye size={24} />
                    <div>
                        <span className="portal-stat-num">{toBanglaNumber(analytics.totalViews)}</span>
                        <span className="portal-stat-label">মোট পাঠক</span>
                    </div>
                </div>
                <div className="portal-stat-card">
                    <BookOpen size={24} />
                    <div>
                        <span className="portal-stat-num">{toBanglaNumber(analytics.totalStories)}</span>
                        <span className="portal-stat-label">মোট গল্প</span>
                    </div>
                </div>
                <div className="portal-stat-card success">
                    <CheckCircle size={24} />
                    <div>
                        <span className="portal-stat-num">{toBanglaNumber(analytics.publishedStories)}</span>
                        <span className="portal-stat-label">প্রকাশিত</span>
                    </div>
                </div>
                <div className="portal-stat-card warning">
                    <Clock size={24} />
                    <div>
                        <span className="portal-stat-num">{toBanglaNumber(analytics.pendingStories)}</span>
                        <span className="portal-stat-label">পর্যালোচনায়</span>
                    </div>
                </div>
                <div className="portal-stat-card muted">
                    <FileText size={24} />
                    <div>
                        <span className="portal-stat-num">{toBanglaNumber(analytics.draftStories)}</span>
                        <span className="portal-stat-label">খসড়া</span>
                    </div>
                </div>
            </div>

            {analytics.topStories.length > 0 && (
                <div className="portal-top-stories">
                    <h3>সেরা গল্প (পাঠক সংখ্যা অনুযায়ী)</h3>
                    <div className="portal-analytics-table">
                        <div className="portal-analytics-head">
                            <span>শিরোনাম</span>
                            <span>অবস্থা</span>
                            <span>পাঠক</span>
                            <span>মন্তব্য</span>
                        </div>
                        {analytics.topStories.map((s) => (
                            <div key={s.id} className="portal-analytics-row">
                                <span className="portal-analytics-title">{s.title}</span>
                                <span className={`portal-status-badge ${STATUS_COLORS[s.status] || 'status-draft'}`}>
                                    {STATUS_LABELS[s.status] || s.status}
                                </span>
                                <span>{toBanglaNumber(s.views)}</span>
                                <span>{toBanglaNumber(s.comments)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main AuthorPortalPage ──────────────────────────────────────────────────────
const AuthorPortalPage = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        getCurrentUser()
            .then((u) => { setCurrentUser(u); setIsAuthChecking(false); })
            .catch(() => setIsAuthChecking(false));

        const sub = onAuthStateChange((_e, session) => {
            setCurrentUser(session?.user ?? null);
            setIsAuthChecking(false);
        });
        return () => sub?.unsubscribe?.();
    }, []);

    if (isAuthChecking) {
        return <div className="portal-auth-checking">লোড হচ্ছে...</div>;
    }

    if (!currentUser) {
        return <Navigate to={buildAuthPageLink('/login', location.pathname, location.pathname)} replace />;
    }

    const navLinks = [
        { to: '/author-portal', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, exact: true },
        { to: '/author-portal/my-stories', label: 'আমার গল্প', icon: BookOpen },
        { to: '/author-portal/new-story', label: 'নতুন গল্প', icon: PlusCircle },
        { to: '/author-portal/analytics', label: 'Analytics', icon: BarChart2 }
    ];

    const isActive = (to: string, exact?: boolean) =>
        exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/author-portal';

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const editMatch = location.pathname.match(/^\/author-portal\/edit\/(.+)$/);

    return (
        <div className="author-portal">
            <aside className="portal-sidebar">
                <div className="portal-sidebar-brand">
                    <Link to="/">
                        <BookOpen size={24} />
                        <span>লেখক পোর্টাল</span>
                    </Link>
                </div>

                <nav className="portal-nav">
                    {navLinks.map(({ to, label, icon: Icon, exact }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`portal-nav-link ${isActive(to, exact) ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                            <ChevronRight size={14} className="portal-nav-arrow" />
                        </Link>
                    ))}
                </nav>

                <div className="portal-sidebar-footer">
                    <div className="portal-user-info">
                        <UserIcon size={16} />
                        <span>{currentUser.displayName || currentUser.username}</span>
                    </div>
                    <Link to="/" className="portal-back-site">
                        <ArrowLeft size={14} /> সাইটে ফিরুন
                    </Link>
                    <button className="portal-signout-btn" onClick={() => void handleSignOut()}>
                        <LogOut size={14} /> সাইন আউট
                    </button>
                </div>
            </aside>

            <main className="portal-content">
                <Routes>
                    <Route path="/" element={<PortalDashboard user={currentUser} />} />
                    <Route path="/my-stories" element={<MyStories />} />
                    <Route path="/new-story" element={<StoryEditor />} />
                    <Route path="/edit/:editId" element={<StoryEditorWrapper />} />
                    <Route path="/analytics" element={<PortalAnalytics />} />
                    <Route path="*" element={<Navigate to="/author-portal" replace />} />
                </Routes>
                {editMatch && null}
            </main>
        </div>
    );
};

const StoryEditorWrapper = () => {
    const location = useLocation();
    const editId = location.pathname.match(/\/edit\/(.+)$/)?.[1];
    return <StoryEditor editId={editId} />;
};

export default AuthorPortalPage;
