import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Search } from 'lucide-react';
import { buildAuthPageLink } from '../utils/authRedirect';
import { getCurrentUser, onAuthStateChange, signOut } from '../utils/auth';
import { APPEARANCE_STORAGE_KEY, applyTheme } from '../utils/theme';
import type { User } from '../utils/userManager';
import BrandLogo from './BrandLogo';
import './Header.css';

export default function Header() {
    const [menuState, setMenuState] = useState({ open: false, path: '' });
    const [scrolled, setScrolled] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isMenuOpen = menuState.open && menuState.path === location.pathname;
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const loginPath = buildAuthPageLink('/login', currentPath);
    const signupPath = buildAuthPageLink('/signup', currentPath);
    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
    const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || currentUser?.username || '';
    const userBadgeLabel = isStaff ? 'Dashboard access' : 'Reader account';
    const userInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (window.innerWidth > 768) return;
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    useEffect(() => {
        let isMounted = true;

        const loadUser = async () => {
            const user = await getCurrentUser();
            if (isMounted) {
                setCurrentUser(user);
            }
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

    const closeMenu = () => {
        setMenuState({ open: false, path: location.pathname });
    };

    const toggleMenu = () => {
        setMenuState((prev) =>
            prev.open && prev.path === location.pathname
                ? { open: false, path: location.pathname }
                : { open: true, path: location.pathname }
        );
    };

    const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

    const navigation = [
        { name: 'Home', path: '/', label: 'হোম' },
        { name: 'Audiobooks', path: '/audiobooks', label: 'অডিওবুক' },
        { name: 'Stories', path: '/stories', label: 'গল্প' },
        { name: 'Series', path: '/series', label: 'সিরিজ' },
        { name: 'Authors', path: '/authors', label: 'লেখক' },
        { name: 'Skills', path: '/skills', label: 'দক্ষতা' },
        { name: 'Links', path: '/links', label: 'লিংক' },
        { name: 'Contact', path: '/contact', label: 'যোগাযোগ' }
    ];

    const handleThemeToggle = () => {
        const root = document.documentElement;
        const current = root.getAttribute('data-theme');
        const resolved = current === 'light' || current === 'dark' ? current : 'dark';
        const next = resolved === 'light' ? 'dark' : 'light';
        localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
        applyTheme(next);
    };

    const handleLogout = async () => {
        closeMenu();
        await signOut();
        setCurrentUser(null);
        navigate('/stories');
    };

    return (
        <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
            <div className="container">
                <nav className="nav">
                    <Link to="/" className="logo">
                        <BrandLogo alt="মাহিয়ানের গল্পকথা" className="site-logo" />
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
                                aria-label="Search stories"
                                onClick={() => {
                                    navigate('/stories');
                                    closeMenu();
                                }}
                            >
                                <Search size={18} />
                            </button>
                            <span className="nav-action-divider" aria-hidden="true" />
                            <button
                                type="button"
                                className="nav-icon-btn"
                                aria-label="Toggle theme"
                                onClick={handleThemeToggle}
                            >
                                <Moon size={18} />
                            </button>
                            <span className="nav-action-divider" aria-hidden="true" />
                            {currentUser ? (
                                <>
                                    {isStaff ? (
                                        <Link to="/admin/dashboard" className="nav-action-link" onClick={closeMenu}>
                                            Dashboard
                                        </Link>
                                    ) : null}
                                    <Link to="/profile" className="nav-user-chip" onClick={closeMenu}>
                                        <span className="nav-user-avatar">
                                            {currentUser.photoURL ? (
                                                <img src={currentUser.photoURL} alt={displayName || 'User'} />
                                            ) : (
                                                userInitial
                                            )}
                                        </span>
                                        <span className="nav-user-copy">
                                            <strong>{displayName || 'Profile'}</strong>
                                            <small>{userBadgeLabel}</small>
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        className="nav-action-link nav-logout-btn"
                                        onClick={() => void handleLogout()}
                                    >
                                        Log out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to={loginPath} className="nav-action-link" onClick={closeMenu}>
                                        লগ ইন
                                    </Link>
                                    <Link to={signupPath} className="nav-btn-pill" onClick={closeMenu}>
                                        সাইন আপ
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}
