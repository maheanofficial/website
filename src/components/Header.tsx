import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

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

    const isActive = (path: string) => location.pathname === path;

    const navigation = [
        { name: 'Home', path: '/', label: 'হোম' },
        { name: 'Audiobooks', path: '/audiobooks', label: 'অডিওবুক' },
        { name: 'Stories', path: '/stories', label: 'গল্প' },
        { name: 'Skills', path: '/skills', label: 'দক্ষতা' },
        { name: 'Links', path: '/links', label: 'লিংক' },
        { name: 'Contact', path: '/contact', label: 'যোগাযোগ' },
    ];

    return (
        <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
            <div className="container">
                <nav className="nav">
                    <Link to="/" className="logo">
                        <span className="logo-text" style={{ color: 'white' }}>মাহিয়ানের গল্পকথা</span>
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
                        <Link to="/admin" className="nav-link" style={{ fontSize: '0.7rem', opacity: 0.5 }}>লগিন / সাইন আপ</Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}
