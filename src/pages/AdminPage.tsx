import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Users, Hash, LogOut, Trash2, Activity, ShieldCheck } from 'lucide-react';
import './AdminPage.css';
import AdminStories from '../components/admin/AdminStories';
import AdminAuthors from '../components/admin/AdminAuthors';
import AdminCategories from '../components/admin/AdminCategories';
import AdminTrash from '../components/admin/AdminTrash';
import AdminActivityLog from '../components/admin/AdminActivityLog';
import AdminLoginHistory from '../components/admin/AdminLoginHistory';
import DashboardAnalytics from '../components/admin/DashboardAnalytics';
import { logLoginAttempt } from '../utils/loginHistoryManager';
import { loginUser, registerUser, getCurrentUser, setCurrentUserSession, logoutUser, type User } from '../utils/userManager';

const AdminPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('mahean_admin_active_tab') || 'stories';
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
        }
    }, []);

    // Persist activeTab when it changes
    useEffect(() => {
        localStorage.setItem('mahean_admin_active_tab', activeTab);
    }, [activeTab]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isLoginMode) {
                const result = loginUser(username, password);
                if (result.success && result.user) {
                    await logLoginAttempt(true);
                    setCurrentUserSession(result.user);
                    setCurrentUser(result.user);
                    setIsAuthenticated(true);
                } else {
                    await logLoginAttempt(false);
                    setErrorMsg(result.message);
                }
            } else {
                // Sign Up
                const result = registerUser(username, password);
                if (result.success) {
                    setSuccessMsg(result.message);
                    setIsLoginMode(true); // Switch to login after success
                } else {
                    setErrorMsg(result.message);
                }
            }
        } catch (error) {
            setErrorMsg('An unexpected error occurred');
        }

        setIsLoading(false);
    };

    const handleLogout = () => {
        logoutUser();
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    // Components Map
    // Components Map
    const renderContent = () => {
        // If writer, limited view
        if (currentUser?.role === 'writer') {
            switch (activeTab) {
                case 'stories': return <AdminStories user={currentUser} />; // Pass user to filter/create their stories
                // Writers might want to edit their profile? For now just stories.
                default: return <AdminStories user={currentUser} />;
            }
        }

        // Admin View
        switch (activeTab) {
            case 'stories': return <AdminStories />;
            case 'authors': return <AdminAuthors />;
            case 'categories': return <AdminCategories />;
            case 'trash': return <AdminTrash />;
            case 'activity': return <AdminActivityLog />;
            case 'login_history': return <AdminLoginHistory />;
            case 'dashboard': return <DashboardAnalytics />;
            default: return <AdminStories />;
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="login-container">
                <form className="login-box" onSubmit={handleAuth}>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        {isLoginMode ? 'Login' : 'Sign Up'}
                    </h2>

                    {errorMsg && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm text-center">{errorMsg}</div>}
                    {successMsg && <div className="bg-green-500/10 text-green-500 p-3 rounded mb-4 text-sm text-center">{successMsg}</div>}

                    <div className="form-group text-left mb-4">
                        <label>Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="form-group text-left mb-6">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-full mb-4" disabled={isLoading}>
                        {isLoading ? 'Processing...' : (isLoginMode ? 'Login' : 'Sign Up')}
                    </button>

                    <div className="auth-toggle-box">
                        <p className="auth-toggle-text">
                            {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                        </p>
                        <button
                            type="button"
                            className="auth-toggle-btn"
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setErrorMsg('');
                                setSuccessMsg('');
                            }}
                        >
                            {isLoginMode ? "Create New Account" : "Login to Account"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    const isAdmin = currentUser?.role === 'admin';

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h1 className="gradient-text">{isAdmin ? 'Admin Panel' : 'Writer Panel'}</h1>
                </div>

                <div className="px-6 mb-6">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400">Welcome,</p>
                        <p className="font-bold text-white truncate">{currentUser?.displayName || currentUser?.username}</p>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                            {currentUser?.role}
                        </span>
                    </div>
                </div>

                <nav>
                    <div className="sidebar-title">Menu</div>

                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                        >
                            <LayoutDashboard size={20} />
                            <span>Dashboard</span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('stories')}
                        className={`sidebar-btn ${activeTab === 'stories' ? 'active' : ''}`}
                    >
                        <BookOpen size={20} />
                        <span>{isAdmin ? 'Stories' : 'My Stories'}</span>
                    </button>

                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('authors')}
                                className={`sidebar-btn ${activeTab === 'authors' ? 'active' : ''}`}
                            >
                                <Users size={20} />
                                <span>Authors</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('categories')}
                                className={`sidebar-btn ${activeTab === 'categories' ? 'active' : ''}`}
                            >
                                <Hash size={20} />
                                <span>Categories</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('trash')}
                                className={`sidebar-btn ${activeTab === 'trash' ? 'active' : ''}`}
                            >
                                <Trash2 size={20} />
                                <span>Recycle Bin</span>
                            </button>
                            <div className="sidebar-title mt-6">System</div>
                            <button
                                onClick={() => setActiveTab('activity')}
                                className={`sidebar-btn ${activeTab === 'activity' ? 'active' : ''}`}
                            >
                                <Activity size={20} />
                                <span>Activity Log</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('login_history')}
                                className={`sidebar-btn ${activeTab === 'login_history' ? 'active' : ''}`}
                            >
                                <ShieldCheck size={20} />
                                <span>Login History</span>
                            </button>
                        </>
                    )}


                    <button onClick={handleLogout} className="sidebar-btn text-red-400 hover:text-red-300">
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminPage;
