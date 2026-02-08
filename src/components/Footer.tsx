import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <Link to="/">
                            <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" className="footer-logo" />
                        </Link>
                        <p className="footer-description">
                            মাহিয়ানের গল্পকথা হলো বাংলা গল্প ও অডিওবুকের নতুন ঠিকানা। থ্রিলার, রোমাঞ্চ
                            ও রহস্যের গল্প পড়ুন ও শুনুন একসাথে।
                        </p>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">এক্সপ্লোর</h3>
                        <div className="footer-links">
                            <Link to="/series" className="footer-link">সিরিজ</Link>
                            <Link to="/authors" className="footer-link">লেখক</Link>
                            <Link to="/categories" className="footer-link">ক্যাটাগরি</Link>
                            <Link to="/tags" className="footer-link">ট্যাগ</Link>
                            <a href="/sitemap.xml" className="footer-link">সাইটম্যাপ</a>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">পেজসমূহ</h3>
                        <div className="footer-links">
                            <Link to="/about" className="footer-link">আমাদের সম্পর্কে</Link>
                            <Link to="/stories" className="footer-link">সব গল্প</Link>
                            <Link to="/contact" className="footer-link">যোগাযোগ</Link>
                            <Link to="/links" className="footer-link">গুরুত্বপূর্ণ লিংক</Link>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">নীতি</h3>
                        <div className="footer-links">
                            <Link to="/privacy" className="footer-link">গোপনীয়তা নীতি</Link>
                            <Link to="/terms" className="footer-link">শর্তাবলী</Link>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">সামাজিক মিডিয়া</h3>
                        <div className="footer-links">
                            <a href="https://facebook.com/maheanahmed" className="footer-link">Facebook</a>
                            <a href="https://youtube.com/@maheanstoryvoice" className="footer-link">YouTube</a>
                        </div>
                    </div>
                </div>

                <div className="footer-centered-section">
                    <div className="footer-subscription">
                        <h4 className="footer-heading-sm">নতুন গল্পের আপডেট পান</h4>
                        <p className="footer-small-text">ইমেইল দিন, নতুন গল্প প্রকাশ হলে আগে জানুন</p>

                        <form className="subscription-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="input-group">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    placeholder="আপনার ইমেইল লিখুন..."
                                    className="subscription-input"
                                />
                            </div>
                            <button className="subscription-btn">
                                সাবস্ক্রাইব করুন <ArrowRight size={16} />
                            </button>
                        </form>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        &copy; {new Date().getFullYear()} Mahean Ahmed. All rights reserved.
                    </p>
                    <div className="footer-social">
                        <span className="footer-text">বাংলাদেশে ভালোবাসা দিয়ে তৈরি</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
