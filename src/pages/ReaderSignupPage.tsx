import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, User, BookOpen } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import {
    buildAuthPageLink,
    clearStoredAuthRedirectIntent,
    consumeStoredAuthRedirectIntent,
    readAuthNextPath
} from '../utils/authRedirect';
import { signInWithGoogle, signUpWithEmail, getCurrentUser } from '../utils/auth';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';
import './ReaderAuthPage.css';

const ConstellationCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

        const stars: { x: number; y: number; vx: number; vy: number; depth: number }[] = [];
        const numStars = 90;
        const maxOffset = 35;
        const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                depth: 0.2 + Math.random() * 0.8
            });
        }

        let animId: number;
        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.12)';

            mouse.x += (mouse.targetX - mouse.x) * 0.06;
            mouse.y += (mouse.targetY - mouse.y) * 0.06;
            const offsetX = ((mouse.x - width / 2) / Math.max(width / 2, 1)) * maxOffset;
            const offsetY = ((mouse.y - height / 2) / Math.max(height / 2, 1)) * maxOffset;

            stars.forEach((star, i) => {
                star.x += star.vx;
                star.y += star.vy;
                if (star.x < 0 || star.x > width) star.vx *= -1;
                if (star.y < 0 || star.y > height) star.vy *= -1;

                const drawX = star.x + offsetX * star.depth;
                const drawY = star.y + offsetY * star.depth;

                ctx.beginPath();
                ctx.arc(drawX, drawY, 1.4, 0, Math.PI * 2);
                ctx.fill();

                stars.forEach((other, j) => {
                    if (i === j) return;
                    const ox = other.x + offsetX * other.depth;
                    const oy = other.y + offsetY * other.depth;
                    const dist = Math.sqrt((drawX - ox) ** 2 + (drawY - oy) ** 2);
                    if (dist < 130) {
                        ctx.globalAlpha = 1 - dist / 130;
                        ctx.beginPath();
                        ctx.moveTo(drawX, drawY);
                        ctx.lineTo(ox, oy);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                });
            });

            animId = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        };
        const handleMouseMove = (e: MouseEvent) => { mouse.targetX = e.clientX; mouse.targetY = e.clientY; };
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) { mouse.targetX = e.touches[0].clientX; mouse.targetY = e.touches[0].clientY; }
        };
        const resetMouse = () => { mouse.targetX = width / 2; mouse.targetY = height / 2; };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('mouseleave', resetMouse);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseleave', resetMouse);
        };
    }, []);

    return <canvas ref={canvasRef} className="constellation-canvas" />;
};

const ReaderSignupPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = readAuthNextPath(location.search, '/profile');
    const loginPath = buildAuthPageLink('/reader/login', nextPath);

    useEffect(() => {
        let isMounted = true;
        const checkUser = async () => {
            const user = await getCurrentUser();
            if (isMounted && user) {
                navigate(consumeStoredAuthRedirectIntent() || nextPath, { replace: true });
            }
        };
        void checkUser();
        return () => { isMounted = false; };
    }, [navigate, nextPath]);

    const handleGoogleSignup = async () => {
        setErrorMsg('');
        try {
            await signInWithGoogle(nextPath);
        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : 'Google সাইন-আপ ব্যর্থ হয়েছে।');
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (password !== confirmPassword) {
            setErrorMsg('পাসওয়ার্ড দুটি মিলছে না।');
            return;
        }
        if (password.length < 6) {
            setErrorMsg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
            return;
        }
        setIsLoading(true);
        try {
            const result = await signUpWithEmail(email, password, name);
            if (result?.needsEmailConfirmation) {
                setErrorMsg('আপনার ইমেইল চেক করুন এবং কনফার্মেশন লিংকে ক্লিক করুন।');
                return;
            }
            clearStoredAuthRedirectIntent();
            navigate(nextPath, { replace: true });
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'সাইন আপ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page reader-portal-page">
            <SEO
                title="পাঠক রেজিস্ট্রেশন - মাহিয়ানের গল্পকথা"
                description="মাহিয়ানের গল্পকথায় নতুন পাঠক অ্যাকাউন্ট তৈরি করুন। বিনামূল্যে রেজিস্ট্রেশন করুন।"
                canonicalUrl="/reader/signup"
                noIndex
                noFollow
            />

            <ConstellationCanvas />

            <div className="portal-content-wrapper reader-content-wrapper">
                <div className="reader-portal-header">
                    <Link to="/">
                        <BrandLogo alt="মাহিয়ানের গল্পকথা" className="reader-portal-logo" />
                    </Link>
                    <div className="reader-portal-tagline">
                        <BookOpen size={18} />
                        <span>পাঠক পোর্টাল</span>
                    </div>
                </div>

                <div className="login-card-glass reader-login-card">
                    <div className="login-header">
                        <h2>নতুন অ্যাকাউন্ট তৈরি করুন</h2>
                        <p>বিনামূল্যে রেজিস্ট্রেশন করুন এবং সুবিধা উপভোগ করুন</p>
                    </div>

                    <button className="google-btn reader-google-btn" onClick={() => void handleGoogleSignup()}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        গুগল দিয়ে রেজিস্টার করুন
                    </button>

                    <div className="divider"><span>অথবা</span></div>

                    <form onSubmit={(e) => void handleSignup(e)} className="login-form">
                        <div className="form-group">
                            <label>আপনার নাম</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    placeholder="পুরো নাম"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoComplete="name"
                                />
                                <User size={18} className="input-icon" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>ইমেইল ঠিকানা</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                                <Mail size={18} className="input-icon" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>পাসওয়ার্ড</label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="কমপক্ষে ৬ অক্ষর"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    style={{ paddingLeft: '16px' }}
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

                        <div className="form-group">
                            <label>পাসওয়ার্ড নিশ্চিত করুন</label>
                            <div className="input-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="পাসওয়ার্ড আবার দিন"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    style={{ paddingLeft: '16px' }}
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

                        {errorMsg && (
                            <div className="reader-auth-error">{errorMsg}</div>
                        )}

                        <button type="submit" className="login-submit-btn reader-submit-btn" disabled={isLoading}>
                            {isLoading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
                        </button>
                    </form>

                    <div className="login-footer">
                        ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                        <Link to={loginPath} className="signup-link">লগ ইন করুন</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReaderSignupPage;
