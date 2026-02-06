import { useState, useEffect } from 'react';
import { Link, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Home, Settings, User as UserIcon, X, Folder, FileText } from 'lucide-react';
import './AdminPage.css';
import AdminStories from '../components/admin/AdminStories';
import AdminAuthors from '../components/admin/AdminAuthors';
import AdminEpisodes from '../components/admin/AdminEpisodes';
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
        return '';
    };

    const activeTab = getActiveTab();

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

            {/* Main Content Area */}
            <main className="admin-main">
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
                        {/* Fallback */}
                        <Route path="*" element={<DashboardAnalytics />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;
