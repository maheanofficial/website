import { useState, useEffect } from 'react';
import { Link, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Home, Settings, User as UserIcon, X, Folder, FileText } from 'lucide-react';
import './AdminPage.css';
import AdminStories from '../components/admin/AdminStories';
import AdminAuthors from '../components/admin/AdminAuthors';
import AdminEpisodes from '../components/admin/AdminEpisodes';
import AdminSettings from '../components/admin/AdminSettings';
import AdminProfile from '../components/admin/AdminProfile';
import DashboardAnalytics from '../components/admin/DashboardAnalytics';
import { onAuthStateChange, getCurrentUser, signOut } from '../utils/auth';


const AdminPage = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

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

    // Close mobile menu on path changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/login');
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

    // Helper to determine active tab for styling
    const getActiveTab = () => {
        const path = location.pathname;
        if (path === '/author/dashboard' || path === '/author/dashboard/') return 'dashboard';
        if (path.includes('/series')) return 'stories';
        if (path.includes('/episodes')) return 'episodes';
        if (path.includes('/authors')) return 'authors';
        if (path.includes('/settings')) return 'settings';
        if (path.includes('/profile')) return 'profile';
        return '';
    };

    const activeTab = getActiveTab();

    // Dev-time debug: log current auth state for troubleshooting
    if (import.meta.env.DEV) {
        console.log('AdminPage debug - isAuthChecking:', isAuthChecking, 'currentUser:', currentUser);
    }

    const renderBreadcrumbs = () => {
        const path = location.pathname;
        const crumbs: { label: string, path: string, icon?: React.ReactNode }[] = [
            { label: 'ড্যাশবোর্ড', path: '/author/dashboard', icon: <LayoutDashboard size={14} /> }
        ];

        if (path.includes('/series')) {
            crumbs.push({ label: 'সিরিজ', path: '/author/dashboard/series', icon: undefined });
            if (path.includes('/create')) {
                crumbs.push({ label: 'তৈরি', path: '', icon: undefined });
            } else if (path.includes('/edit')) {
                crumbs.push({ label: 'এডিট', path: '', icon: undefined });
            }
        } else if (path.includes('/episodes')) {
            crumbs.push({ label: 'পর্ব', path: '/author/dashboard/episodes', icon: undefined });
        } else if (path.includes('/authors')) {
            crumbs.push({ label: 'লেখক', path: '/author/dashboard/authors', icon: undefined });
        } else if (path.includes('/settings')) {
            crumbs.push({ label: 'সেটিংস', path: '/author/dashboard/settings/profile', icon: undefined });
            if (path.includes('/password')) {
                crumbs.push({ label: 'পাসওয়ার্ড', path: '', icon: undefined });
            } else if (path.includes('/appearance')) {
                crumbs.push({ label: 'অ্যাপিয়ারেন্স', path: '', icon: undefined });
            } else {
                crumbs.push({ label: 'প্রোফাইল', path: '', icon: undefined });
            }
        } else if (path.includes('/profile')) {
            crumbs.push({ label: 'প্রোফাইল', path: '/author/dashboard/profile', icon: undefined });
        }

        return (
            <div className="breadcrumbs">
                {crumbs.map((crumb, index) => (
                    <div key={index} className="crumb-unit">
                        {index > 0 && <span className="crumb-sep">&gt;</span>}
                        <div className="crumb-item">
                            {crumb.icon && <span className="crumb-icon">{crumb.icon}</span>}
                            {crumb.path ? (
                                <Link to={crumb.path} className={`crumb-text ${index === crumbs.length - 1 ? 'active' : ''}`}>
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="crumb-text active">{crumb.label}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const userMetadata = (currentUser as any)?.user_metadata || {};
    const displayName = currentUser?.displayName
        || userMetadata.full_name
        || userMetadata.name
        || currentUser?.email?.split('@')[0]
        || 'User';
    const avatarUrl = currentUser?.photoURL
        || userMetadata.avatar_url
        || userMetadata.picture;
    const userInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';

    return (
        <div className="admin-layout">
            {/* Mobile Header Toggle */}
            <button
                className="admin-mobile-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X size={24} /> : <LayoutDashboard size={24} />}
            </button>

            {/* Side Navigation */}
            <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="admin-brand">
                    <img src="/assets/logo.png" alt="GolpoHub" className="admin-logo-img" />
                </div>

                <div className="sidebar-section">
                    <div className="sidebar-label">প্লাটফর্ম</div>
                    <nav className="sidebar-nav">
                        <Link to="/" className="sidebar-item">
                            <Home size={18} />
                            <span>হোম</span>
                        </Link>
                        <Link
                            to="/author/dashboard"
                            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        >
                            <LayoutDashboard size={18} />
                            <span>ড্যাশবোর্ড</span>
                        </Link>
                        <Link
                            to="/author/dashboard/series"
                            className={`sidebar-item ${activeTab === 'stories' ? 'active' : ''}`}
                        >
                            <Folder size={18} />
                            <span>সিরিজ</span>
                        </Link>
                        <Link
                            to="/author/dashboard/episodes"
                            className={`sidebar-item ${activeTab === 'episodes' ? 'active' : ''}`}
                        >
                            <FileText size={18} />
                            <span>পর্ব</span>
                        </Link>
                    </nav>
                </div>

                <div className="sidebar-footer-menu">
                    <Link
                        to="/author/dashboard/settings/profile"
                        className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                        <Settings size={18} />
                        <span>সেটিংস</span>
                    </Link>
                    <Link
                        to="/author/dashboard/profile"
                        className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
                    >
                        <UserIcon size={18} />
                        <span>প্রোফাইল</span>
                    </Link>
                </div>

                <div className="sidebar-user-profile">
                    <div className="user-avatar-sm">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="User" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            userInitial
                        )}
                    </div>
                    <div className="user-info-mini">
                        <div className="u-name">{displayName}</div>
                        <button onClick={handleLogout} className="u-logout">Log out</button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">
                {import.meta.env.DEV && (
                    <div className="debug-overlay">
                        <div>isAuthChecking: {String(isAuthChecking)}</div>
                        <div>user: {currentUser ? (currentUser.email || currentUser.id || 'signed-in') : 'null'}</div>
                    </div>
                )}
                <header className="admin-topbar">
                    {renderBreadcrumbs()}
                </header>

                <div className="admin-content-scroll">
                    <Routes>
                        <Route path="/" element={<DashboardAnalytics />} />
                        <Route path="/series" element={<AdminStories />} />
                        <Route path="/series/create" element={<AdminStories initialViewMode="create" />} />
                        <Route path="/series/edit/:id" element={<AdminStories initialViewMode="edit" />} />
                        <Route path="/episodes" element={<AdminEpisodes />} />
                        <Route path="/authors" element={<AdminAuthors />} />
                        <Route path="/profile" element={<AdminProfile />} />
                        <Route path="/settings/*" element={<AdminSettings />} />
                        {/* Fallback */}
                        <Route path="*" element={<DashboardAnalytics />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;
