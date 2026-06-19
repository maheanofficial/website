import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    BookOpen, 
    PlusCircle, 
    User, 
    Eye, 
    MessageSquare, 
    FileText,
    LogOut,
    CheckCircle,
    Clock,
    AlertCircle,
    Send
} from 'lucide-react';
import { getCurrentUser, signOut } from '../utils/auth';
import { getStories, saveStory, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { getAllCategories, type Category } from '../utils/categoryManager';
import SEO from '../components/SEO';
import SmartImage from '../components/SmartImage';
import type { User as AppUser } from '../utils/userManager';
import './WriterDashboard.css';

const normalizeValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

const WriterDashboard = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [myStories, setMyStories] = useState<Story[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'stories' | 'submit' | 'profile' | 'settings'>('overview');
    const [isLoading, setIsLoading] = useState(true);

    // Submit Story Form State
    const [newStoryTitle, setNewStoryTitle] = useState('');
    const [newStoryExcerpt, setNewStoryExcerpt] = useState('');
    const [newStoryContent, setNewStoryContent] = useState('');
    const [newStoryCategory, setNewStoryCategory] = useState('');
    const [newStoryTags, setNewStoryTags] = useState('');
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const user = await getCurrentUser();
                if (!isMounted) return;

                if (!user) {
                    navigate('/login?next=' + encodeURIComponent(window.location.pathname));
                    return;
                }

                setCurrentUser(user);

                const [allStories, allCategories] = await Promise.all([
                    getStories(),
                    getAllCategories()
                ]);
                
                if (!isMounted) return;

                setCategories(allCategories);
                if (allCategories.length > 0) {
                    setNewStoryCategory(allCategories[0].id);
                }

                // Filter stories submitted by user or matching author name
                const filtered = allStories.filter(
                    (story) =>
                        story.submittedBy === user.id ||
                        (user.displayName && normalizeValue(story.author) === normalizeValue(user.displayName)) ||
                        (user.username && normalizeValue(story.author) === normalizeValue(user.username))
                );

                setMyStories(filtered);
            } catch (err) {
                console.error('Error loading writer dashboard', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void loadDashboardData();
        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const handleStorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStoryTitle.trim() || !newStoryExcerpt.trim() || !newStoryContent.trim()) {
            setFormStatus({ type: 'error', message: 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন।' });
            return;
        }

        setIsSubmitting(true);
        setFormStatus(null);

        try {
            const authorName = currentUser?.displayName || currentUser?.username || 'লেখক';
            const categoryName = categories.find((c: Category) => c.id === newStoryCategory)?.name || 'গল্প';

            const storyData: Partial<Story> = {
                title: newStoryTitle.trim(),
                excerpt: newStoryExcerpt.trim(),
                content: newStoryContent.trim(),
                categoryId: newStoryCategory,
                category: categoryName,
                author: authorName,
                authorId: currentUser?.id || 'unknown',
                submittedBy: currentUser?.id,
                date: new Date().toLocaleDateString('en-US'),
                views: 0,
                comments: 0,
                status: 'pending', // Pending admin approval
                tags: newStoryTags.split(',').map(t => t.trim()).filter(Boolean),
                parts: []
            };

            await saveStory(storyData as Story);

            setFormStatus({
                type: 'success',
                message: 'গল্পটি সফলভাবে জমা দেওয়া হয়েছে এবং অনুমোদনের অপেক্ষায় আছে।'
            });

            // Reset form
            setNewStoryTitle('');
            setNewStoryExcerpt('');
            setNewStoryContent('');
            setNewStoryTags('');

            // Reload stories
            const allStories = await getStories();
            const filtered = allStories.filter(
                (story) =>
                    story.submittedBy === currentUser?.id ||
                    (currentUser?.displayName && normalizeValue(story.author) === normalizeValue(currentUser.displayName))
            );
            setMyStories(filtered);
        } catch (err) {
            console.error('Failed to submit story', err);
            setFormStatus({ type: 'error', message: 'গল্পটি জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="wd-loading-container">
                <div className="loading-spinner"></div>
                <p>ড্যাশবোর্ড লোড হচ্ছে...</p>
            </div>
        );
    }

    if (!currentUser) return null;

    // Stats calculations
    const totalStories = myStories.length;
    const totalViews = myStories.reduce((sum, story) => sum + (story.views || 0), 0);
    const totalComments = myStories.reduce((sum, story) => sum + (story.comments || 0), 0);
    const pendingStories = myStories.filter(story => story.status === 'pending').length;

    return (
        <div className="writer-dashboard">
            <SEO
                title="রাইটার ড্যাশবোর্ড | Mahean Ahmed"
                description="Mahean Ahmed প্লাটফর্মে লেখকদের ড্যাশবোর্ড। আপনার গল্প এবং পরিসংখ্যান পরিচালনা করুন।"
                noIndex={true}
            />

            {/* Sidebar */}
            <aside className="wd-sidebar">
                <div className="wd-sidebar-brand">
                    <h2>লেখক ড্যাশবোর্ড</h2>
                    <span className="wd-role-badge">লেখক</span>
                </div>

                <nav className="wd-sidebar-menu">
                    <button 
                        className={`wd-sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <LayoutDashboard size={18} />
                        <span>ওভারভিউ</span>
                    </button>
                    <button 
                        className={`wd-sidebar-item ${activeTab === 'stories' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stories')}
                    >
                        <BookOpen size={18} />
                        <span>আমার গল্পসমূহ</span>
                    </button>
                    <button 
                        className={`wd-sidebar-item ${activeTab === 'submit' ? 'active' : ''}`}
                        onClick={() => setActiveTab('submit')}
                    >
                        <PlusCircle size={18} />
                        <span>নতুন গল্প লিখুন</span>
                    </button>
                    <button 
                        className={`wd-sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <User size={18} />
                        <span>প্রোফাইল</span>
                    </button>
                </nav>

                <div className="wd-sidebar-footer">
                    <div className="wd-user-mini">
                        <SmartImage 
                            src={currentUser.photoURL} 
                            alt={currentUser.displayName || 'User'} 
                            className="wd-user-avatar"
                            isRound={true}
                        />
                        <div className="wd-user-info">
                            <strong>{currentUser.displayName || currentUser.username}</strong>
                            <span>{currentUser.email}</span>
                        </div>
                    </div>
                    <button className="wd-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>লগ আউট</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="wd-content">
                {activeTab === 'overview' && (
                    <div className="wd-tab-content fade-in">
                        <div className="wd-welcome-banner">
                            <h1>স্বাগতম, {currentUser.displayName || currentUser.username}! 👋</h1>
                            <p>আজকে একটি নতুন চমৎকার গল্প আপনার পাঠকদের উপহার দিন।</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="wd-stats-grid">
                            <div className="wd-stat-card bg-gradient-orange">
                                <div className="wd-stat-icon"><FileText size={24} /></div>
                                <div className="wd-stat-data">
                                    <h3>মোট গল্প</h3>
                                    <strong>{toBanglaNumber(totalStories)}টি</strong>
                                </div>
                            </div>
                            <div className="wd-stat-card bg-gradient-blue">
                                <div className="wd-stat-icon"><Eye size={24} /></div>
                                <div className="wd-stat-data">
                                    <h3>মোট ভিউ</h3>
                                    <strong>{toBanglaNumber(totalViews)} বার</strong>
                                </div>
                            </div>
                            <div className="wd-stat-card bg-gradient-purple">
                                <div className="wd-stat-icon"><MessageSquare size={24} /></div>
                                <div className="wd-stat-data">
                                    <h3>মন্তব্যসমূহ</h3>
                                    <strong>{toBanglaNumber(totalComments)}টি</strong>
                                </div>
                            </div>
                            <div className="wd-stat-card bg-gradient-green">
                                <div className="wd-stat-icon"><Clock size={24} /></div>
                                <div className="wd-stat-data">
                                    <h3>অপেক্ষমান গল্প</h3>
                                    <strong>{toBanglaNumber(pendingStories)}টি</strong>
                                </div>
                            </div>
                        </div>

                        {/* Recent Stories & Activity */}
                        <div className="wd-panels-row">
                            <div className="wd-panel">
                                <div className="wd-panel-header">
                                    <h2>সাম্প্রতিক গল্পসমূহ</h2>
                                    <button onClick={() => setActiveTab('stories')} className="btn-text">সব দেখুন</button>
                                </div>
                                <div className="wd-panel-body">
                                    {myStories.length === 0 ? (
                                        <div className="wd-empty-state">
                                            <p>এখনও কোনো গল্প লিখেননি।</p>
                                            <button onClick={() => setActiveTab('submit')} className="wd-btn-primary small">
                                                প্রথম গল্প লিখুন
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="wd-recent-stories-list">
                                            {myStories.slice(0, 4).map((story) => (
                                                <div key={story.id} className="wd-story-list-item">
                                                    <div className="wd-story-info">
                                                        <h4>{story.title}</h4>
                                                        <span className="wd-story-meta">
                                                            {story.category} • {toBanglaNumber(story.views || 0)} ভিউ
                                                        </span>
                                                    </div>
                                                    <span className={`wd-status-badge ${story.status || 'published'}`}>
                                                        {story.status === 'pending' ? 'রিভিউধীন' : 
                                                         story.status === 'rejected' ? 'বাতিল' : 'প্রকাশিত'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stories' && (
                    <div className="wd-tab-content fade-in">
                        <div className="wd-tab-header">
                            <h2>আমার গল্পসমূহ</h2>
                            <button onClick={() => setActiveTab('submit')} className="wd-btn-primary">
                                <PlusCircle size={16} />
                                <span>নতুন গল্প লিখুন</span>
                            </button>
                        </div>

                        {myStories.length === 0 ? (
                            <div className="wd-empty-state-large">
                                <BookOpen size={48} />
                                <h3>কোনো গল্প পাওয়া যায়নি</h3>
                                <p>আপনার এখনও কোনো গল্প আপলোড করা নেই। পাঠকদের জন্য আজই শুরু করুন!</p>
                                <button onClick={() => setActiveTab('submit')} className="wd-btn-primary">
                                    নতুন গল্প লিখুন
                                </button>
                            </div>
                        ) : (
                            <div className="wd-stories-table-wrapper">
                                <table className="wd-stories-table">
                                    <thead>
                                        <tr>
                                            <th>গল্পের নাম</th>
                                            <th>ক্যাটেগরি</th>
                                            <th>তারিখ</th>
                                            <th>ভিউ</th>
                                            <th>স্ট্যাটাস</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myStories.map((story) => (
                                            <tr key={story.id}>
                                                <td className="wd-td-title">
                                                    <strong>{story.title}</strong>
                                                </td>
                                                <td>{story.category}</td>
                                                <td>{story.date}</td>
                                                <td>{toBanglaNumber(story.views || 0)}</td>
                                                <td>
                                                    <span className={`wd-status-badge ${story.status || 'published'}`}>
                                                        {story.status === 'pending' ? 'রিভিউধীন' : 
                                                         story.status === 'rejected' ? 'বাতিল' : 'প্রকাশিত'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'submit' && (
                    <div className="wd-tab-content fade-in">
                        <div className="wd-tab-header">
                            <h2>নতুন গল্প লিখুন</h2>
                        </div>

                        <form onSubmit={handleStorySubmit} className="wd-form-card">
                            {formStatus && (
                                <div className={`wd-form-alert ${formStatus.type}`}>
                                    {formStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                    <span>{formStatus.message}</span>
                                </div>
                            )}

                            <div className="wd-form-group">
                                <label>গল্পের শিরোনাম *</label>
                                <input 
                                    type="text" 
                                    value={newStoryTitle}
                                    onChange={(e) => setNewStoryTitle(e.target.value)}
                                    placeholder="গল্পের আকর্ষণীয় নাম লিখুন"
                                    required
                                />
                            </div>

                            <div className="wd-form-grid">
                                <div className="wd-form-group">
                                    <label>ক্যাটেগরি *</label>
                                    <select 
                                        value={newStoryCategory}
                                        onChange={(e) => setNewStoryCategory(e.target.value)}
                                    >
                                        {categories.map((cat: Category) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="wd-form-group">
                                    <label>ট্যাগসমূহ (কমা দিয়ে আলাদা করুন)</label>
                                    <input 
                                        type="text" 
                                        value={newStoryTags}
                                        onChange={(e) => setNewStoryTags(e.target.value)}
                                        placeholder="থ্রিলার, রোমান্টিক, রহস্য"
                                    />
                                </div>
                            </div>

                            <div className="wd-form-group">
                                <label>গল্পের সংক্ষিপ্ত বিবরণ (Excerpt) *</label>
                                <textarea 
                                    value={newStoryExcerpt}
                                    onChange={(e) => setNewStoryExcerpt(e.target.value)}
                                    placeholder="গল্পের মূল আকর্ষণ এক বা দুই লাইনে লিখুন"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="wd-form-group">
                                <label>মূল গল্প *</label>
                                <textarea 
                                    value={newStoryContent}
                                    onChange={(e) => setNewStoryContent(e.target.value)}
                                    placeholder="এখানে আপনার সম্পূর্ণ গল্পটি লিখুন"
                                    rows={10}
                                    required
                                />
                            </div>

                            <button type="submit" className="wd-btn-submit" disabled={isSubmitting}>
                                <Send size={16} />
                                <span>{isSubmitting ? 'জমা দেওয়া হচ্ছে...' : 'প্রকাশের জন্য জমা দিন'}</span>
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="wd-tab-content fade-in">
                        <div className="wd-tab-header">
                            <h2>লেখক প্রোফাইল</h2>
                        </div>

                        <div className="wd-profile-card">
                            <div className="wd-profile-header">
                                <SmartImage 
                                    src={currentUser.photoURL} 
                                    alt={currentUser.displayName || 'User'} 
                                    className="wd-profile-avatar"
                                    isRound={true}
                                />
                                <div className="wd-profile-title">
                                    <h3>{currentUser.displayName || currentUser.username}</h3>
                                    <span className="wd-profile-tag">নিবন্ধিত লেখক</span>
                                </div>
                            </div>

                            <div className="wd-profile-info-grid">
                                <div className="wd-info-item">
                                    <span>ব্যবহারকারীর নাম (Username)</span>
                                    <strong>{currentUser.username}</strong>
                                </div>
                                <div className="wd-info-item">
                                    <span>ইমেইল এড্রেস</span>
                                    <strong>{currentUser.email || 'যুক্ত করা হয়নি'}</strong>
                                </div>
                                <div className="wd-info-item">
                                    <span>অ্যাকাউন্ট রোল</span>
                                    <strong>{currentUser.role}</strong>
                                </div>
                                <div className="wd-info-item">
                                    <span>যোগদানের তারিখ</span>
                                    <strong>{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('bn-BD') : 'অজানা'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WriterDashboard;
