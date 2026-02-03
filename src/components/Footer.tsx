import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h2 className="footer-title" style={{ color: 'white' }}>মাহিয়ানের গল্পকথা</h2>
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

                        <div className="mt-6 p-4 bg-slate-800/40 rounded-xl border border-white/5 backdrop-blur-sm">

                            <p className="text-gray-400 text-xs mb-3">নতুন গল্পের আপডেট পেতে ইমেইল দিন।</p>
                            <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
                                <div className="relative">
                                    <input
                                        type="email"
                                        placeholder="example@mail.com"
                                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                                <button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium py-2 rounded-lg text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-[0.98]">
                                    সাবস্ক্রাইব করুন
                                </button>
                            </form>
                        </div>
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
