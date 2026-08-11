import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, User, PenLine, FileText } from 'lucide-react';
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
import './WriterAuthPage.css';

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
        const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

        for (let i = 0; i < 90; i++) {
            stars.push({
                x: Math.random() * width, y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
                depth: 0.2 + Math.random() * 0.8
            });
        }

        let animId: number;
        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
            mouse.x += (mouse.targetX - mouse.x) * 0.06;
            mouse.y += (mouse.targetY - mouse.y) * 0.06;
            const ox = ((mouse.x - width / 2) / Math.max(width / 2, 1)) * 35;
            const oy = ((mouse.y - height / 2) / Math.max(height / 2, 1)) * 35;

            stars.forEach((star, i) => {
                star.x += star.vx; star.y += star.vy;
                if (star.x < 0 || star.x > width) star.vx *= -1;
                if (star.y < 0 || star.y > height) star.vy *= -1;
                const dx = star.x + ox * star.depth, dy = star.y + oy * star.depth;
                ctx.beginPath(); ctx.arc(dx, dy, 1.4, 0, Math.PI * 2); ctx.fill();
                stars.forEach((other, j) => {
                    if (i === j) return;
                    const ex = other.x + ox * other.depth, ey = other.y + oy * other.depth;
                    const dist = Math.sqrt((dx - ex) ** 2 + (dy - ey) ** 2);
                    if (dist < 130) {
                        ctx.globalAlpha = 1 - dist / 130;
                        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(ex, ey); ctx.stroke();
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

const WriterSignupPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [bio, setBio] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = readAuthNextPath(location.search, '/writer/dashboard');
    const loginPath = buildAuthPageLink('/writer/login', nextPath);

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
            await signInWithGoogle('/writer/dashboard');
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
            navigate('/writer/dashboard', { replace: true });
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'সাইন আপ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page writer-portal-page">
            <SEO
                title="লেখক রেজিস্ট্রেশন - মাহিয়ানের গল্পকথা"
                description="মাহিয়ানের গল্পকথায় লেখক হিসেবে নতুন অ্যাকাউন্ট তৈরি করুন এবং আপনার লেখা গল্প প্রকাশ করুন।"
                canonicalUrl="/writer/signup"
                noIndex
                noFollow
            />
            <ConstellationCanvas />

            <div className="portal-content-wrapper writer-content-wrapper">
                <div className="writer-portal-header">
                    <Link to="/">
                        <BrandLogo alt="মাহিয়ানের গল্পকথা" className="writer-portal-logo" />
                    </Link>
                    <div className="writer-portal-tagline">
                        <PenLine size={16} />
                        <span>লেখক রেজিস্ট্রেশন</span>
                    </div>
                </div>

                <div className="login-card-glass writer-login-card">
                    <div className="login-header">
                        <h2>লেখক হিসেবে যোগ দিন</h2>
                        <p>রেজিস্টার করুন এবং আপনার গল্প সারা বিশ্বের কাছে পৌঁছে দিন</p>
                    </div>

                    <button className="google-btn writer-google-btn" onClick={() => void handleGoogleSignup()}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        গুগল দিয়ে রেজিস্টার করুন
                    </button>

                    <div className="divider"><span>অথবা</span></div>

                    <form onSubmit={(e) => void handleSignup(e)} className="login-form">
                        <div className="form-group">
                            <label>আপনার নাম (লেখক হিসেবে)</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    placeholder="আপনার নাম"
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
                            <label>সংক্ষিপ্ত পরিচয় / বায়ো (ঐচ্ছিক)</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    placeholder="যেমন: থ্রিলার ও রোমান্টিক গল্পের ভক্ত ও লেখক"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                />
                                <FileText size={18} className="input-icon" />
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
                                <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
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
                                <button type="button" className="toggle-pass" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {errorMsg && <div className="writer-auth-error">{errorMsg}</div>}

                        <button type="submit" className="login-submit-btn writer-submit-btn" disabled={isLoading}>
                            {isLoading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'লেখক অ্যাকাউন্ট তৈরি করুন'}
                        </button>
                    </form>

                    <div className="login-footer">
                        ইতিমধ্যে লেখক অ্যাকাউন্ট আছে?{' '}
                        <Link to={loginPath} className="signup-link">লগ ইন করুন</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WriterSignupPage;
