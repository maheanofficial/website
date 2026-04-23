import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import {
    buildAuthPageLink,
    clearStoredAuthRedirectIntent,
    consumeStoredAuthRedirectIntent,
    readAuthNextPath
} from '../utils/authRedirect';
import { signInWithGoogle, signInWithEmailOnly, getCurrentUser } from '../utils/auth';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';

const SubmitStoryPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = readAuthNextPath(location.search, '/profile');
    const signupPath = buildAuthPageLink('/signup', nextPath);

    useEffect(() => {
        let isMounted = true;
        const syncAuthFromCallback = async () => {
            const user = await getCurrentUser();
            if (isMounted && user) {
                navigate(consumeStoredAuthRedirectIntent() || nextPath, { replace: true });
            }
        };
        syncAuthFromCallback();
        return () => {
            isMounted = false;
        };
    }, [navigate, nextPath]);

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle(nextPath);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Google sign-in failed. Please try again.';
            alert(message);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailOnly(email, password);
            clearStoredAuthRedirectIntent();
            navigate(nextPath, { replace: true });
        } catch (error: unknown) {
            console.error('Login error:', error);
            const message = error instanceof Error ? error.message : 'অনুগ্রহ করে আবার চেষ্টা করুন।';
            alert(`লগইন ব্যর্থ হয়েছে: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO
                title="ইউজার লগইন - মাহিয়ানের গল্পকথা"
                description="আপনার রিডার অ্যাকাউন্টে লগ ইন করে প্রিয় গল্প, সিরিজ এবং প্রোফাইল ম্যানেজ করুন।"
                canonicalUrl="/login"
                noIndex
                noFollow
            />

            <div className="portal-content-wrapper">
                <div className="portal-brand-center">
                    <Link to="/"><BrandLogo size="lg" /></Link>
                </div>

                {/* Login Form Section */}
                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>আপনার ইউজার অ্যাকাউন্টে লগ ইন করুন</h2>
                        <p>লগ ইন করতে আপনার ইমেইল এবং পাসওয়ার্ড লিখুন</p>
                    </div>

                    <button className="google-btn" onClick={handleGoogleLogin}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        গুগল দিয়ে লগইন করুন
                    </button>

                    <div className="divider">
                        <span>অথবা</span>
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label>ইমেইল / ইউজারনেম</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
                                    required
                                />
                                <Mail size={18} className="input-icon" />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="label-row">
                                <label>পাসওয়ার্ড</label>
                                <Link to="/forgot-password" className="forgot-pass">পাসওয়ার্ড ভুলে গেছেন?</Link>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="পাসওয়ার্ড"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-pass"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-check">
                            <input type="checkbox" id="remember" />
                            <label htmlFor="remember">আমাকে মনে রাখবেন</label>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? 'লগ ইন হচ্ছে...' : 'লগ ইন'}
                        </button>
                    </form>

                    <div className="login-footer">
                        কোনো অ্যাকাউন্ট নেই? <Link to={signupPath} className="signup-link">সাইন আপ করুন</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmitStoryPage;
