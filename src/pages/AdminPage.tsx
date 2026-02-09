import { useState, useEffect } from 'react';
import { Link, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Home, Settings, User as UserIcon, X, BookOpen, Users, CheckCircle, UserPlus } from 'lucide-react';
import './AdminPage.css';
import AdminStories from '../components/admin/AdminStories';
import AdminAuthors from '../components/admin/AdminAuthors';
import AdminSettings from '../components/admin/AdminSettings';
import AdminProfile from '../components/admin/AdminProfile';
import DashboardAnalytics from '../components/admin/DashboardAnalytics';
import AdminApprovals from '../components/admin/AdminApprovals';
import AdminUsers from '../components/admin/AdminUsers';
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
        if (path === '/admin/dashboard' || path === '/admin/dashboard/') return 'dashboard';
        if (path.includes('/golpo')) return 'golpo';
        if (path.includes('/authors')) return 'authors';
        if (path.includes('/approvals')) return 'approvals';
        if (path.includes('/users')) return 'users';
        if (path.includes('/settings')) return 'settings';
        if (path.includes('/profile')) return 'profile';
        return '';
    };

    const activeTab = getActiveTab();
    const isAdmin = currentUser?.role === 'admin';

    const renderBreadcrumbs = () => {
        const path = location.pathname;
        const crumbs: { label: string, path: string, icon?: React.ReactNode }[] = [
            { label: 'ড্যাশবোর্ড', path: '/admin/dashboard', icon: <LayoutDashboard size={14} /> }
        ];

        if (path.includes('/golpo')) {
            crumbs.push({ label: '\u0997\u09b2\u09cd\u09aa', path: '/admin/dashboard/golpo', icon: undefined });
            if (path.includes('/create')) {
                crumbs.push({ label: '\u09a4\u09c8\u09b0\u09bf', path: '', icon: undefined });
            } else if (path.includes('/edit')) {
                crumbs.push({ label: '\u098f\u09a1\u09bf\u099f', path: '', icon: undefined });
            }
        } else if (path.includes('/authors')) {
            crumbs.push({ label: 'লেখক', path: '/admin/dashboard/authors', icon: undefined });
        } else if (path.includes('/approvals')) {
            crumbs.push({ label: 'Approvals', path: '/admin/dashboard/approvals', icon: undefined });
        } else if (path.includes('/users')) {
            crumbs.push({ label: 'Users', path: '/admin/dashboard/users', icon: undefined });
        } else if (path.includes('/settings')) {
            crumbs.push({ label: 'সেটিংস', path: '/admin/dashboard/settings/profile', icon: undefined });
            if (path.includes('/password')) {
                crumbs.push({ label: 'পাসওয়ার্ড', path: '', icon: undefined });
            } else if (path.includes('/appearance')) {
                crumbs.push({ label: 'অ্যাপিয়ারেন্স', path: '', icon: undefined });
            } else {
                crumbs.push({ label: 'প্রোফাইল', path: '', icon: undefined });
            }
        } else if (path.includes('/profile')) {
            crumbs.push({ label: 'প্রোফাইল', path: '/admin/dashboard/profile', icon: undefined });
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
                            to="/admin/dashboard"
                            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        >
                            <LayoutDashboard size={18} />
                            <span>ড্যাশবোর্ড</span>
                        </Link>
                        <Link
                            to="/admin/dashboard/golpo"
                            className={`sidebar-item ${activeTab === 'golpo' ? 'active' : ''}`}
                        >
                            <BookOpen size={18} />
                            <span>গল্প</span>
                        </Link>
                        <Link
                            to="/admin/dashboard/authors"
                            className={`sidebar-item ${activeTab === 'authors' ? 'active' : ''}`}
                        >
                            <Users size={18} />
                            <span>{'\u09b2\u09c7\u0996\u0995'}</span>
                        </Link>
                    </nav>
                </div>

                {isAdmin && (
                    <div className="sidebar-section">
                        <div className="sidebar-label">Admin</div>
                        <nav className="sidebar-nav">
                            <Link
                                to="/admin/dashboard/approvals"
                                className={`sidebar-item ${activeTab === 'approvals' ? 'active' : ''}`}
                            >
                                <CheckCircle size={18} />
                                <span>Approvals</span>
                            </Link>
                            <Link
                                to="/admin/dashboard/users"
                                className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
                            >
                                <UserPlus size={18} />
                                <span>Users</span>
                            </Link>
                        </nav>
                    </div>
                )}

                <div className="sidebar-footer-menu">
                    <Link
                        to="/admin/dashboard/settings/profile"
                        className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                        <Settings size={18} />
                        <span>সেটিংস</span>
                    </Link>
                    <Link
                        to="/admin/dashboard/profile"
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
                        <div className="u-role">{isAdmin ? 'Admin' : 'Moderator'}</div>
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
                        <Route path="/golpo" element={<AdminStories user={currentUser} />} />
                        <Route path="/golpo/create" element={<AdminStories user={currentUser} initialViewMode="create" />} />
                        <Route path="/golpo/edit/:id" element={<AdminStories user={currentUser} initialViewMode="edit" />} />
                                                <Route path="/authors" element={<AdminAuthors />} />
                        <Route
                            path="/approvals"
                            element={isAdmin ? <AdminApprovals /> : <Navigate to="/admin/dashboard" replace />}
                        />
                        <Route
                            path="/users"
                            element={isAdmin ? <AdminUsers /> : <Navigate to="/admin/dashboard" replace />}
                        />
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
