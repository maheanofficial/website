import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Search } from 'lucide-react';
import { APPEARANCE_STORAGE_KEY, applyTheme } from '../utils/theme';
import './Header.css';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

    const navigation = [
        { name: 'Home', path: '/', label: 'হোম' },
        { name: 'Audiobooks', path: '/audiobooks', label: 'অডিওবুক' },
        { name: 'Stories', path: '/stories', label: 'গল্প' },
        { name: 'Series', path: '/series', label: 'সিরিজ' },
        { name: 'Authors', path: '/authors', label: 'লেখক' },
        { name: 'Skills', path: '/skills', label: 'দক্ষতা' },
        { name: 'Links', path: '/links', label: 'লিংক' },
        { name: 'Contact', path: '/contact', label: 'যোগাযোগ' },
    ];

    const handleThemeToggle = () => {
        const root = document.documentElement;
        const current = root.getAttribute('data-theme');
        const resolved = current === 'light' || current === 'dark' ? current : 'dark';
        const next = resolved === 'light' ? 'dark' : 'light';
        localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
        applyTheme(next);
    };

    return (
        <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
            <div className="container">
                <nav className="nav">
                    <Link to="/" className="logo">
                        <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" className="site-logo" />
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <button
                        className={`menu-toggle ${isMenuOpen ? 'menu-toggle-open' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
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
                                    onClick={() => setIsMenuOpen(false)}
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
                                    setIsMenuOpen(false);
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
                            <Link to="/admin" className="nav-action-link" onClick={() => setIsMenuOpen(false)}>
                                লগ ইন
                            </Link>
                            <Link to="/signup" className="nav-btn-pill" onClick={() => setIsMenuOpen(false)}>
                                সাইন আপ
                            </Link>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}
