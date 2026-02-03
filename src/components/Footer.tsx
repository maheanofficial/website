import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
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

                        <div className="mt-8 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative p-6 bg-slate-900/90 ring-1 ring-white/10 rounded-xl leading-none flex items-top justify-start space-x-6">
                                <div className="space-y-4 w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                            <Mail size={18} />
                                        </div>
                                        <p className="text-slate-300 font-medium text-sm">নতুন গল্পের আপডেট পান</p>
                                    </div>

                                    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                                        <div className="relative group/input">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-amber-500 transition-colors">
                                                <Mail size={16} />
                                            </div>
                                            <input
                                                type="email"
                                                placeholder="আপনার ইমেইল দিন..."
                                                className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300"
                                            />
                                        </div>
                                        <button className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-white font-bold py-3 rounded-lg text-sm transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.98] flex items-center justify-center gap-2">
                                            সাবস্ক্রাইব করুন <ArrowRight size={16} />
                                        </button>
                                    </form>
                                    <p className="text-slate-500 text-[10px] text-center">আমরা স্প্যাম করি না, কথা দিলাম। 🤞</p>
                                </div>
                            </div>
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
