import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { signInWithGoogle, signInWithEmailOnly } from '../utils/auth';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';

            // Go to the author dashboard which mounts the admin UI
            navigate('/author/dashboard');
const ConstellationCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

        const stars: { x: number, y: number, vx: number, vy: number }[] = [];
        const numStars = 80; // Increased star count for full screen

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3, // Slightly slower for elegance
                vy: (Math.random() - 0.5) * 0.3
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Slightly more visible lines

            stars.forEach((star, i) => {
                star.x += star.vx;
                star.y += star.vy;

                if (star.x < 0 || star.x > width) star.vx *= -1;
                if (star.y < 0 || star.y > height) star.vy *= -1;

                ctx.beginPath();
                ctx.arc(star.x, star.y, 1.5, 0, Math.PI * 2);
                ctx.fill();

                stars.forEach((otherStar, j) => {
                    if (i === j) return;
                    const dx = star.x - otherStar.x;
                    const dy = star.y - otherStar.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(star.x, star.y);
                        ctx.lineTo(otherStar.x, otherStar.y);
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
            // Re-initialize stars ideally, but for now just resizing canvas prevents stretch
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <canvas ref={canvasRef} className="constellation-canvas" />;
};

const SubmitStoryPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            alert('গুগল দিয়ে লগ ইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailOnly(email, password);
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            alert(`লগইন ব্যর্থ হয়েছে: ${error.message || 'অনুগ্রহ করে আবার চেষ্টা করুন।'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO title="লেখক পোর্টাল - লগ ইন করুন | মাহিয়ানের গল্পকথা" description="মাহিয়ানের গল্পকথা লেখক পোর্টালে লগ ইন করুন।" />

            {/* Background Animation covering full screen */}
            <ConstellationCanvas />

            {/* Centered Content Wrapper */}
            <div className="portal-content-wrapper">

                {/* Header Section */}
                <div className="portal-header">
                    <div className="portal-brand-center">
                        <Link to="/">
                            <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" className="portal-logo" />
                        </Link>
                    </div>

                    <div className="portal-hero-center">
                        <h1>লেখক পোর্টাল</h1>
                        <p>""যদি এমন কোনো বই থাকে যা আপনি পড়তে চান, কিন্তু তা এখনও লেখা হয়নি, তবে তা আপনাকেই লিখতে হবে।""</p>
                        <cite>— টনি মরিসন</cite>
                    </div>
                </div>

                {/* Login Form Section */}
                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>আপনার অ্যাকাউন্টে লগ ইন করুন</h2>
                        <p>লগ ইন করতে আপনার ইমেইল এবং পাসওয়ার্ড লিখুন</p>
                    </div>

                    <button className="google-btn" onClick={handleGoogleLogin}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        গুগল দিয়ে লগইন করুন
                    </button>

                    <div className="divider">
                        <span>অথবা</span>
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label>ইমেইল ঠিকানা</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
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
                                <label>পাসওয়ার্ড</label>
                                <Link to="/forgot-password" className="forgot-pass">পাসওয়ার্ড ভুলে গেছেন?</Link>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="পাসওয়ার্ড"
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
                        কোনো অ্যাকাউন্ট নেই? <Link to="/signup" className="signup-link">সাইন আপ করুন</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmitStoryPage;
