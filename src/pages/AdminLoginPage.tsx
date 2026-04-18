import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import {
    buildAuthPageLink,
    clearStoredAuthRedirectIntent,
    consumeStoredAuthRedirectIntent,
    readAuthNextPath
} from '../utils/authRedirect';
import { signInWithGoogle, signInWithEmailOnly, getCurrentUser, signOut } from '../utils/auth';
import SEO from '../components/SEO';
import type { User } from '../utils/userManager';
import './SubmitStoryPage.css';

const hasStaffAccess = (user: User | null) =>
    user?.role === 'admin' || user?.role === 'moderator';

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
        const numStars = 80;
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
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                depth: 0.2 + Math.random() * 0.8
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';

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

const AdminLoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const nextPath = readAuthNextPath(location.search, '/admin/dashboard');
    const signupPath = buildAuthPageLink('/admin/signup', nextPath, '/admin/dashboard');
    const userLoginPath = buildAuthPageLink('/login', '/stories');

    useEffect(() => {
        let isMounted = true;
        const syncAuthFromCallback = async () => {
            const user = await getCurrentUser();
            if (isMounted && hasStaffAccess(user)) {
                navigate(consumeStoredAuthRedirectIntent() || nextPath, { replace: true });
            }
        };
        void syncAuthFromCallback();
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

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailOnly(email, password);
            const user = await getCurrentUser();
            if (!hasStaffAccess(user)) {
                await signOut();
                alert('This account does not have admin dashboard access.');
                return;
            }
            clearStoredAuthRedirectIntent();
            navigate(nextPath, { replace: true });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Admin login failed. Please try again.';
            alert(`Login failed: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO
                title="Admin Dashboard Login | Mahean"
                description="Log in to access the admin dashboard."
                canonicalUrl="/admin/login"
                noIndex
                noFollow
            />

            <ConstellationCanvas />

            <div className="portal-content-wrapper">
                <div className="portal-header">
                    <div className="portal-brand-center">
                        <Link to="/">
                            <BrandLogo alt="Mahean" className="portal-logo" />
                        </Link>
                    </div>

                    <div className="portal-hero-center">
                        <h1>Admin Portal</h1>
                        <p>Sign in with your admin or moderator account to manage dashboard content.</p>
                        <cite>- Dashboard Access</cite>
                    </div>
                </div>

                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>Log in to dashboard</h2>
                        <p>Use your email and password to continue.</p>
                    </div>

                    <button className="google-btn" onClick={() => void handleGoogleLogin()}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                        Continue with Google
                    </button>

                    <div className="divider">
                        <span>or</span>
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    placeholder="admin@domain.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                                <Mail size={18} className="input-icon" />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="label-row">
                                <label>Password</label>
                                <Link to="/forgot-password" className="forgot-pass">Forgot password?</Link>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
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

                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <div className="login-footer">
                        Need a staff account? <Link to={signupPath} className="signup-link">Admin signup</Link>
                    </div>
                    <div className="login-footer">
                        Reader account? <Link to={userLoginPath} className="signup-link">User login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
