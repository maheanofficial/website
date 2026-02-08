import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { resetPasswordForEmail } from '../utils/auth';
import SEO from '../components/SEO';
import './SubmitStoryPage.css'; // Reusing the login/signup CSS

// Constellation Effect Component
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
            setMessage('????? ?????? ??????? ??? ??????? ??? ???? ?????????? ??? ???? ????? ?????????? ???? ????');
        } catch (err) {
            setError('লিংক পাঠাতে সমস্যা হয়েছে। ইমেইলটি সঠিক কি না যাচাই করুন।');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO
                title="পাসওয়ার্ড ভুলে গেছেন? - মাহিয়ানের গল্পকথা"
                description="মাহিয়ানের গল্পকথা পাসওয়ার্ড রিসেট পেজ।"
                noIndex
                noFollow
                canonicalUrl="/forgot-password"
            />

            <ConstellationCanvas />

            <div className="portal-content-wrapper">
                {/* Header Section */}
                <div className="portal-header">
                    <div className="portal-brand-center">
                        <Link to="/">
                            <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" className="portal-logo" />
                        </Link>
                    </div>
                </div>

                {/* Reset Form Section */}
                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>পাসওয়ার্ড ভুলে গেছেন</h2>
                        <p>পাসওয়ার্ড রিসেট লিংক পেতে আপনার ইমেইল লিখুন</p>
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
