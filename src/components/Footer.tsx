import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import PushSubscription from './PushSubscription';
import './Footer.css';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/contact@mahean.com';

export default function Footer() {
    const emailRef = useRef<HTMLInputElement>(null);
    const [subState, setSubState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = emailRef.current?.value?.trim();
        if (!email) return;
        setSubState('loading');
        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email, _subject: 'Newsletter Subscription — mahean.com' }),
            });
            setSubState(res.ok ? 'success' : 'error');
        } catch {
            setSubState('error');
        }
    };
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <Link to="/">
                            <img src="/assets/logo-solid.png" alt="মাহিয়ানের গল্পকথা" className="footer-logo" />
                        </Link>
                        <p className="footer-description">
                            মাহিয়ানের গল্পকথা হলো বাংলা গল্প ও অডিওবুকের নতুন ঠিকানা।
                            থ্রিলার, রোমাঞ্চ ও রহস্যের গল্প পড়ুন ও শুনুন একসাথে।
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
                            <a href="/rss.xml" className="footer-link">RSS ফিড</a>
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
                            <Link to="/privacy" className="footer-link">গোপনীয়তা নীতি</Link>
                            <Link to="/terms" className="footer-link">শর্তাবলী</Link>
                            <Link to="/disclaimer" className="footer-link">দাবিত্যাগ</Link>
                            <a href="/ads.txt" className="footer-link">ads.txt</a>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h3 className="footer-heading">সামাজিক মিডিয়া</h3>
                        <div className="footer-links">
                            <a href="https://www.facebook.com/maheanofficial/" className="footer-link">Facebook পেজ</a>
                            <a href="https://www.facebook.com/groups/625486086686426" className="footer-link">Facebook গ্রুপ</a>
                            <a href="https://www.instagram.com/mahean_ahmed/" className="footer-link">Instagram</a>
                            <a href="https://youtube.com/@maheanstoryvoice" className="footer-link">YouTube</a>
                            <PushSubscription />
                        </div>
                    </div>
                </div>

                <div className="footer-centered-section">
                    <div className="footer-subscription">
                        <h4 className="footer-heading-sm">নতুন গল্পের আপডেট পান</h4>
                        <p className="footer-small-text">ইমেইল দিন, নতুন গল্প প্রকাশ হলে আগে জানুন</p>

                        {subState === 'success' ? (
                            <div className="subscription-success">
                                <CheckCircle size={20} />
                                <span>ধন্যবাদ! আপনাকে সাবস্ক্রাইব করা হয়েছে।</span>
                            </div>
                        ) : subState === 'error' ? (
                            <div className="subscription-error">
                                <AlertCircle size={20} />
                                <span>কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।</span>
                            </div>
                        ) : (
                            <form className="subscription-form" onSubmit={(e) => void handleSubscribe(e)}>
                                <div className="input-group">
                                    <Mail className="input-icon" size={18} />
                                    <input
                                        ref={emailRef}
                                        type="email"
                                        placeholder="আপনার ইমেইল লিখুন..."
                                        className="subscription-input"
                                        required
                                        disabled={subState === 'loading'}
                                    />
                                </div>
                                <button className="subscription-btn" disabled={subState === 'loading'}>
                                    {subState === 'loading' ? 'পাঠানো হচ্ছে...' : <><span>সাবস্ক্রাইব করুন</span> <ArrowRight size={16} /></>}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        &copy; {new Date().getFullYear()} Mahean Ahmed. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
