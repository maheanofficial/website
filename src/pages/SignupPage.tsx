import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, User } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import {
    buildAuthPageLink,
    clearStoredAuthRedirectIntent,
    consumeStoredAuthRedirectIntent,
    readAuthNextPath
} from '../utils/authRedirect';
import { signInWithGoogle, signUpWithEmail, getCurrentUser } from '../utils/auth';
import SEO from '../components/SEO';
import './SignupPage.css';

const SignupPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = readAuthNextPath(location.search, '/profile');
    const loginPath = buildAuthPageLink('/login', nextPath);

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

    const handleGoogleSignup = async () => {
        try {
            await signInWithGoogle(nextPath);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Google sign-up failed. Please try again.';
            alert(message);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('পাসওয়ার্ড মিলছে না!');
            return;
        }
        try {
            const result = await signUpWithEmail(email, password, name);
            if (result?.needsEmailConfirmation) {
                alert('Please check your email to confirm your account before logging in.');
                return;
            }
            alert('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
            clearStoredAuthRedirectIntent();
            navigate(nextPath, { replace: true });
        } catch (err: unknown) {
            console.error('Signup error:', err);
            const message = err instanceof Error ? err.message : 'অনুগ্রহ করে আবার চেষ্টা করুন।';
            alert(`সাইন আপ ব্যর্থ হয়েছে: ${message}`);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO
                title="সাইন আপ করুন - মাহিয়ানের গল্পকথা"
                description="মাহিয়ানের গল্পকথায় নতুন অ্যাকাউন্ট তৈরি করুন।"
                canonicalUrl="/signup"
                noIndex
                noFollow
            />

            <div className="portal-content-wrapper">
                <div className="portal-brand-center">
                    <Link to="/"><BrandLogo size="lg" /></Link>
                </div>

                {/* Signup Form Section */}
                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>একটি অ্যাকাউন্ট তৈরি করুন</h2>
                        <p>আপনার অ্যাকাউন্ট তৈরি করতে আপনার বিবরণ লিখুন</p>
                    </div>

                    <button className="google-btn" onClick={handleGoogleSignup}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        গুগল দিয়ে রেজিস্টার করুন
                    </button>

                    <div className="divider">
                        <span>অথবা</span>
                    </div>

                    <form onSubmit={handleSignup} className="login-form">

                        {/* Name Field */}
                        <div className="form-group">
                            <label>নাম</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    placeholder="পুরো নাম"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <User size={18} className="input-icon" />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="form-group">
                            <label>ইমেইল ঠিকানা</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <Mail size={18} className="input-icon" />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="form-group">
                            <label>পাসওয়ার্ড</label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="পাসওয়ার্ড"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        {/* Confirm Password Field */}
                        <div className="form-group">
                            <label>পাসওয়ার্ড নিশ্চিত করুন</label>
                            <div className="input-wrapper">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-pass"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="login-submit-btn">
                            অ্যাকাউন্ট তৈরি করুন
                        </button>
                    </form>

                    <div className="login-footer">
                        ইতিমধ্যে একটি অ্যাকাউন্ট আছে? <Link to={loginPath} className="signup-link">লগ ইন</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
