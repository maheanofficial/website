import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Home, Settings, User as UserIcon, SortDesc, X } from 'lucide-react';
import './AdminPage.css';
import AdminStories from '../components/admin/AdminStories';
import AdminAuthors from '../components/admin/AdminAuthors';
import DashboardAnalytics from '../components/admin/DashboardAnalytics';
import { onAuthStateChange, getCurrentUser, signOut } from '../utils/auth';
import type { User } from '../utils/userManager'; // Import User type if needed, or define locally

const AdminPage = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const user = await getCurrentUser();
            setCurrentUser(user);
            setIsAuthChecking(false);
        };
        checkAuth();

        const subscription = onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user ?? null);
            setIsAuthChecking(false);
        });

        return () => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, []);

    // Close mobile menu on tab change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [activeTab]);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    if (isAuthChecking) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardAnalytics />;
            case 'stories':
                return <AdminStories />;
            case 'authors':
                return <AdminAuthors />;
            default:
                return <DashboardAnalytics />;
        }
    };

    return (
        <div className="admin-layout">
            {/* Mobile Header Toggle */}
            <button
                className="admin-mobile-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X size={24} /> : <LayoutDashboard size={24} />}
            </button>

            {/* GolpoHub Style Sidebar */}
            <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="admin-brand">
                    <img src="/assets/logo.png" alt="GolpoHub" className="admin-logo-img" />
                </div>

                <div className="sidebar-section">
                    <div className="sidebar-label">স্টুডিও</div>
                    <nav className="sidebar-nav">
                        <Link to="/" className="sidebar-item">
                            <Home size={18} />
                            <span>হোম</span>
                        </Link>
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        >
                            <LayoutDashboard size={18} />
                            <span>ড্যাশবোর্ড</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('stories')}
                            className={`sidebar-item ${activeTab === 'stories' ? 'active' : ''}`}
                        >
                            <BookOpen size={18} />
                            <span>সিরিজ</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('episodes')}
                            className={`sidebar-item ${activeTab === 'episodes' ? 'active' : ''}`}
                        >
                            <SortDesc size={18} />
                            <span>পর্ব</span>
                        </button>
                    </nav>
                </div>

                <div className="sidebar-footer-menu">
                    <button className="sidebar-item">
                        <Settings size={18} />
                        <span>সেটিংস</span>
                    </button>
                    <button className="sidebar-item">
                        <UserIcon size={18} />
                        <span>প্রোফাইল</span>
                    </button>
                </div>

                <div className="sidebar-user-profile">
                    <div className="user-avatar-sm">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            currentUser?.displayName?.charAt(0) || 'U'
                        )}
                    </div>
                    <div className="user-info-mini">
                        <div className="u-name">{currentUser?.displayName || 'User'}</div>
                        <button onClick={handleLogout} className="u-logout">Log out</button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="breadcrumbs">
                        <span className="crumb-icon"><BookOpen size={14} /></span>
                        <span className="crumb-text">ড্যাশবোর্ড</span>
                        {activeTab !== 'dashboard' && (
                            <>
                                <span className="crumb-sep">&gt;</span>
                                <span className="crumb-text active">
                                    {activeTab === 'stories' ? 'সিরিজ' :
                                        activeTab === 'episodes' ? 'পর্ব' : activeTab}
                                </span>
                            </>
                        )}
                    </div>
                </header>

                <div className="admin-content-scroll">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminPage;
