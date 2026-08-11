import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import './NotFoundPage.css';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <section className="not-found-page page-offset">
            <SEO
                title="পৃষ্ঠা পাওয়া যায়নি — 404 | Mahean Ahmed"
                description="আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি পাওয়া যায়নি।"
                canonicalUrl="/404"
                noIndex
                noFollow
            />

            {/* Animated background orbs */}
            <div className="nf-bg" aria-hidden="true">
                <div className="nf-orb nf-orb--1" />
                <div className="nf-orb nf-orb--2" />
                <div className="nf-orb nf-orb--3" />
            </div>

            <div className="nf-content">
                {/* Giant 404 number */}
                <div className="nf-number" aria-hidden="true">
                    <span className="nf-digit">4</span>
                    <span className="nf-zero">
                        <div className="nf-zero-inner">
                            <div className="nf-zero-ring" />
                            <div className="nf-zero-dot" />
                        </div>
                    </span>
                    <span className="nf-digit">4</span>
                </div>

                {/* Message */}
                <div className="nf-message">
                    <h1 className="nf-title">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</h1>
                    <p className="nf-subtitle">
                        মনে হচ্ছে আপনি যা খুঁজছেন সেটি আর এখানে নেই, বা কখনো ছিল না।
                        <br />হয়তো লিঙ্কটি পরিবর্তন হয়েছে অথবা মুছে ফেলা হয়েছে।
                    </p>
                </div>

                {/* Action buttons */}
                <div className="nf-actions">
                    <button
                        onClick={() => navigate(-1)}
                        className="nf-btn nf-btn--secondary"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                        আগের পেজে ফিরুন
                    </button>
                    <Link to="/" className="nf-btn nf-btn--primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        হোমে ফিরুন
                    </Link>
                    <Link to="/stories" className="nf-btn nf-btn--ghost">
                        গল্প পড়ুন →
                    </Link>
                </div>

                {/* Quick links */}
                <div className="nf-links">
                    <p className="nf-links-label">দরকারী পেজসমূহ:</p>
                    <div className="nf-links-grid">
                        <Link to="/stories" className="nf-link-pill">📖 সব গল্প</Link>
                        <Link to="/authors" className="nf-link-pill">✍️ লেখকরা</Link>
                        <Link to="/categories" className="nf-link-pill">📂 ক্যাটাগরি</Link>
                        <Link to="/audiobooks" className="nf-link-pill">🎧 অডিওবুক</Link>
                        <Link to="/contact" className="nf-link-pill">📬 যোগাযোগ</Link>
                        <Link to="/series" className="nf-link-pill">📚 সিরিজ</Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NotFoundPage;
