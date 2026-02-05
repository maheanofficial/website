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


                        {/* Auth Buttons Group */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '15px' }}>
                            <Link to="/admin" className="nav-link">লগিন</Link>
                            <Link to="/signup" className="nav-link" style={{ whiteSpace: 'nowrap' }}>সাইন আপ</Link>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}
