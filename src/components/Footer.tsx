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
                            পেশাদার ভয়েস আর্টিস্ট এবং অডিওবুক নির্মাতা। শব্দের জাদুতে গল্প ফুটিয়ে তোলা এবং শ্রোতাদের কাছে পৌঁছে দেওয়াই আমার প্যাশন।
                        </p>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">শর্টকাট লিংক</h3>
                        <div className="footer-links">
                            <Link to="/about" className="footer-link">আমাদের সম্পর্কে</Link>
                            <Link to="/stories" className="footer-link">গল্পের তালিকা</Link>
                            <Link to="/contact" className="footer-link">যোগাযোগ</Link>
                            <Link to="/privacy" className="footer-link">গোপনীয়তা নীতি</Link>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">কানেক্ট করুন</h3>
                        <div className="footer-links">
                            <a href="https://facebook.com/maheanahmed" className="footer-link">Facebook</a>
                            <a href="https://youtube.com/@maheanstoryvoice" className="footer-link">YouTube</a>
                        </div>


                    </div>
                </div>

                <div className="footer-centered-section">
                    <div className="footer-subscription">
                        <h4 className="footer-heading-sm">নতুন গল্পের আপডেট পান</h4>
                        <p className="footer-small-text">আমরা স্প্যাম করি না, কথা দিলাম। 🤞</p>

                        <form className="subscription-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="input-group">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    placeholder="আপনার ইমেইল দিন..."
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
                        <span className="footer-text">Made with ❤️ in Bangladesh</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
