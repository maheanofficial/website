import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { signInWithGoogle, signInWithEmailOnly } from '../utils/auth';
import SEO from '../components/SEO';
import './SubmitStoryPage.css';
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
        const numStars = 80; // Increased star count for full screen
        const maxOffset = 40;
        const mouse = {
            x: width / 2,
            y: height / 2,
            targetX: width / 2,
            targetY: height / 2
        };

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3, // Slightly slower for elegance
                vy: (Math.random() - 0.5) * 0.3,
                depth: 0.2 + Math.random() * 0.8
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Slightly more visible lines

            mouse.x += (mouse.targetX - mouse.x) * 0.08;
            mouse.y += (mouse.targetY - mouse.y) * 0.08;
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
                ctx.arc(drawX, drawY, 1.5, 0, Math.PI * 2);
                ctx.fill();

                stars.forEach((otherStar, j) => {
                    if (i === j) return;
                    const otherX = otherStar.x + offsetX * otherStar.depth;
                    const otherY = otherStar.y + offsetY * otherStar.depth;
                    const dx = drawX - otherX;
                    const dy = drawY - otherY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(drawX, drawY);
                        ctx.lineTo(otherX, otherY);
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
            mouse.x = width / 2;
            mouse.y = height / 2;
            mouse.targetX = width / 2;
            mouse.targetY = height / 2;
            // Re-initialize stars ideally, but for now just resizing canvas prevents stretch
        };

        const handleMouseMove = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.targetX = event.clientX - rect.left;
            mouse.targetY = event.clientY - rect.top;
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!event.touches[0]) return;
            const rect = canvas.getBoundingClientRect();
            mouse.targetX = event.touches[0].clientX - rect.left;
            mouse.targetY = event.touches[0].clientY - rect.top;
        };

        const resetMouse = () => {
            mouse.targetX = width / 2;
            mouse.targetY = height / 2;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('mouseleave', resetMouse);
        window.addEventListener('blur', resetMouse);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseleave', resetMouse);
            window.removeEventListener('blur', resetMouse);
        };
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
            navigate('/admin/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            alert(`লগইন ব্যর্থ হয়েছে: ${error.message || 'অনুগ্রহ করে আবার চেষ্টা করুন।'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO
                title="লেখক পোর্টাল - লগ ইন করুন | মাহিয়ানের গল্পকথা"
                description="মাহিয়ানের গল্পকথা লেখক পোর্টালে লগ ইন করুন।"
                noIndex
                noFollow
                canonicalUrl="/login"
            />

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
