import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, X, Sun, Moon, Monitor } from 'lucide-react';
import { buildAuthPageLink } from '../utils/authRedirect';
import { getCurrentUser, onAuthStateChange, signOut } from '../utils/auth';
import { APPEARANCE_STORAGE_KEY, applyTheme } from '../utils/theme';
import SearchOverlay from './SearchOverlay';
import {
    buildReaderNotifications,
    markReaderNotificationsSeen,
    dismissReaderNotification,
    type ReaderNotification
} from '../utils/readerStateManager';
import { getCachedStories } from '../utils/storyManager';
import type { User } from '../utils/userManager';
import BrandLogo from './BrandLogo';
import './Header.css';

type ThemeMode = 'light' | 'dark' | 'system';

const getStoredTheme = (): ThemeMode => {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
};

export default function Header() {
    const [menuState, setMenuState] = useState({ open: false, path: '' });
    const [scrolled, setScrolled] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [headerVisible, setHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<ReaderNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [activeTheme, setActiveTheme] = useState<ThemeMode>(getStoredTheme);
    const notifRef = useRef<HTMLDivElement>(null);
    const themeRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isMenuOpen = menuState.open && menuState.path === location.pathname;
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const loginPath = buildAuthPageLink('/login', currentPath);
    const signupPath = buildAuthPageLink('/signup', currentPath);
    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
    const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || currentUser?.username || '';
    const userInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY;
            setScrolled(currentY > 50);
            if (currentY < 80) {
                setHeaderVisible(true);
            } else if (currentY > lastScrollY.current + 8) {
                setHeaderVisible(false);
            } else if (currentY < lastScrollY.current - 5) {
                setHeaderVisible(true);
            }
            lastScrollY.current = currentY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (window.innerWidth > 768) return;
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    useEffect(() => {
        let isMounted = true;
        const loadUser = async () => {
            const user = await getCurrentUser();
            if (isMounted) setCurrentUser(user);
        };
        void loadUser();
        const subscription = onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            setCurrentUser(session?.user ?? null);
        });
        return () => {
            isMounted = false;
            subscription?.unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (!currentUser?.id) { setNotifications([]); return; }
        const stories = getCachedStories();
        const notifs = buildReaderNotifications(currentUser.id, stories);
        setNotifications(notifs);
    }, [currentUser]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
                setShowThemeMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const unreadCount = notifications.length;

    const handleOpenNotifications = () => {
        setShowNotifications((v) => !v);
        if (!showNotifications && currentUser?.id) {
            markReaderNotificationsSeen(currentUser.id);
        }
    };

    const handleDismissNotif = (storyId: string) => {
        if (!currentUser?.id) return;
        dismissReaderNotification(currentUser.id, storyId);
        setNotifications((prev) => prev.filter((n) => n.storyId !== storyId));
    };

    const closeMenu = () => setMenuState({ open: false, path: location.pathname });

    const toggleMenu = () => {
        setMenuState((prev) =>
            prev.open && prev.path === location.pathname
                ? { open: false, path: location.pathname }
                : { open: true, path: location.pathname }
        );
    };

    const setTheme = (mode: ThemeMode) => {
        setActiveTheme(mode);
        setShowThemeMenu(false);
        if (mode === 'system') {
            localStorage.removeItem(APPEARANCE_STORAGE_KEY);
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light');
        } else {
            localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
            applyTheme(mode);
        }
    };

    const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

    const navigation = [
        { name: 'home', path: '/', label: 'হোম' },
        { name: 'series', path: '/series', label: 'সিরিজ' },
        { name: 'authors', path: '/authors', label: 'লেখক' },
        { name: 'about', path: '/about', label: 'আমাদের সম্পর্কে' }
    ];

    const handleLogout = async () => {
        closeMenu();
        await signOut();
        setCurrentUser(null);
        navigate('/');
    };

    const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
        { mode: 'light', label: 'লাইট', icon: <Sun size={15} /> },
        { mode: 'dark', label: 'ডার্ক', icon: <Moon size={15} /> },
        { mode: 'system', label: 'সিস্টেম', icon: <Monitor size={15} /> }
    ];

    return (
        <>
        <SearchOverlay open={showSearch} onClose={() => setShowSearch(false)} />
        <header className={`header ${scrolled ? 'header-scrolled' : ''} ${!headerVisible ? 'header-hidden' : ''}`}>
            <div className="container">
                <nav className="nav">
                    <Link to="/" className="logo" onClick={closeMenu}>
                        <BrandLogo size="md" />
                    </Link>

                    <button
                        className={`menu-toggle ${isMenuOpen ? 'menu-toggle-open' : ''}`}
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <div className={`nav-links ${isMenuOpen ? 'nav-links-open' : ''}`}>
                        <div className="nav-menu">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`nav-link ${isActive(item.path) ? 'nav-link-active' : ''}`}
                                    onClick={closeMenu}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        <div className="nav-actions">
                            <button
                                type="button"
                                className="nav-icon-btn"
                                aria-label="Search"
                                onClick={() => { setShowSearch(true); closeMenu(); }}
                            >
                                <Search size={18} />
                            </button>

                            <div className="nav-theme-wrap" ref={themeRef}>
                                <button
                                    type="button"
                                    className="nav-icon-btn"
                                    aria-label="Toggle theme"
                                    onClick={() => setShowThemeMenu((v) => !v)}
                                >
                                    {activeTheme === 'light' ? <Sun size={18} /> : activeTheme === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
                                </button>
                                {showThemeMenu && (
                                    <div className="nav-theme-dropdown">
                                        {themeOptions.map((opt) => (
                                            <button
                                                key={opt.mode}
                                                type="button"
                                                className={`nav-theme-option ${activeTheme === opt.mode ? 'active' : ''}`}
                                                onClick={() => setTheme(opt.mode)}
                                            >
                                                <span className="nav-theme-icon">{opt.icon}</span>
                                                <span>{opt.label}</span>
                                                {activeTheme === opt.mode && <span className="nav-theme-check">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {currentUser && (
                                <div className="nav-notif-wrap" ref={notifRef}>
                                    <button
                                        type="button"
                                        className="nav-icon-btn nav-notif-btn"
                                        aria-label="Notifications"
                                        onClick={handleOpenNotifications}
                                    >
                                        <Bell size={18} />
                                        {unreadCount > 0 && (
                                            <span className="nav-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                        )}
                                    </button>
                                    {showNotifications && (
                                        <div className="nav-notif-dropdown">
                                            <div className="nav-notif-header"><span>বিজ্ঞপ্তি</span></div>
                                            {notifications.length === 0 ? (
                                                <p className="nav-notif-empty">কোনো নতুন বিজ্ঞপ্তি নেই।</p>
                                            ) : (
                                                <div className="nav-notif-list">
                                                    {notifications.slice(0, 8).map((n) => (
                                                        <div key={n.storyId} className="nav-notif-item unread">
                                                            <Link
                                                                to={n.storyPath}
                                                                className="nav-notif-link"
                                                                onClick={() => setShowNotifications(false)}
                                                            >
                                                                <span className="nav-notif-title">{n.storyTitle}</span>
                                                                <span className="nav-notif-msg">
                                                                    {n.reason === 'author' ? 'অনুসৃত লেখকের নতুন গল্প' : n.reason === 'category' ? 'পছন্দের ক্যাটাগরিতে নতুন গল্প' : 'পছন্দের ট্যাগে নতুন গল্প'}
                                                                </span>
                                                            </Link>
                                                            <button
                                                                className="nav-notif-dismiss"
                                                                onClick={() => handleDismissNotif(n.storyId)}
                                                                aria-label="dismiss"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <span className="nav-action-divider" aria-hidden="true" />

                            {currentUser ? (
                                <>
                                    {isStaff ? (
                                        <Link to="/admin/dashboard" className="nav-action-link" onClick={closeMenu}>Dashboard</Link>
                                    ) : (
                                        <Link to="/author-portal" className="nav-action-link" onClick={closeMenu}>লেখক পোর্টাল</Link>
                                    )}
                                    <Link to="/profile" className="nav-user-chip" onClick={closeMenu}>
                                        <span className="nav-user-avatar">
                                            {currentUser.photoURL ? (
                                                <img src={currentUser.photoURL} alt={displayName || 'User'} />
                                            ) : userInitial}
                                        </span>
                                    </Link>
                                    <button type="button" className="nav-action-link nav-logout-btn" onClick={() => void handleLogout()}>
                                        লগ আউট
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to={loginPath} className="nav-action-link" onClick={closeMenu}>লগ ইন</Link>
                                    <Link to={signupPath} className="nav-btn-pill" onClick={closeMenu}>সাইন আপ</Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            </div>
        </header>
        </>
    );
}
