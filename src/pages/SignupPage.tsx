import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, User } from 'lucide-react';
import { signInWithGoogle, signUpWithEmail, getCurrentUser } from '../utils/auth';
import SEO from '../components/SEO';
import './SignupPage.css';

// Constellation Effect Component (Reused logic for consistency)
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
        const numStars = 80;

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';

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
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <canvas ref={canvasRef} className="constellation-canvas" />;
};

const SignupPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const syncAuthFromCallback = async () => {
            const user = await getCurrentUser();
            if (isMounted && user) {
                navigate('/admin/dashboard', { replace: true });
            }
        };
        syncAuthFromCallback();
        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const handleGoogleSignup = async () => {
        try {
            await signInWithGoogle();
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
            alert('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! এখন ড্যাশবোর্ডে নেওয়া হচ্ছে...');
            // Redirect to the author dashboard which serves the admin area
            window.location.href = '/admin/dashboard';
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
                noIndex
                noFollow
                canonicalUrl="/signup"
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
                        ইতিমধ্যে একটি অ্যাকাউন্ট আছে? <Link to="/admin" className="signup-link">লগ ইন</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
