import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { resetPasswordForEmail } from '../utils/auth';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            await resetPasswordForEmail(email);
            setMessage('রিসেট লিংক পাঠানো হয়েছে। আপনার ইমেইল ইনবক্স ও স্প্যাম ফোল্ডার চেক করুন।');
        } catch {
            setError('লিংক পাঠাতে সমস্যা হয়েছে। ইমেইলটি সঠিক কি না যাচাই করুন।');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO
                title="পাসওয়ার্ড ভুলে গেছেন? - মাহিয়ানের গল্পকথা"
                description="মাহিয়ানের গল্পকথা পাসওয়ার্ড রিসেট পেজ।"
                canonicalUrl="/forgot-password"
                noIndex
                noFollow
            />

            <div className="portal-content-wrapper">
                <div className="portal-brand-center">
                    <Link to="/"><BrandLogo size="lg" /></Link>
                </div>

                {/* Reset Form Section */}
                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>পাসওয়ার্ড ভুলে গেছেন</h2>
                        <p>পাসওয়ার্ড রিসেট লিংক পেতে আপনার ইমেইল লিখুন</p>
                    </div>

                    {message && (
                        <div className="p-4 mb-4 text-sm text-green-400 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="p-4 mb-4 text-sm text-red-400 bg-red-500/10 rounded-lg text-center border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>ইমেইল ঠিকানা</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                                    required
                                    className="w-full"
                                />
                                <Mail size={18} className="input-icon" />
                            </div>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? 'লিংক পাঠানো হচ্ছে...' : 'ইমেইল পাসওয়ার্ড রিসেট লিংক'}
                        </button>
                    </form>

                    <div className="login-footer">
                        অথবা, <Link to="/login" className="signup-link inline-flex items-center gap-1">
                            <ArrowLeft size={14} /> ফিরে যান লগ ইন
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
