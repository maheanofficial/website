import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail, User as UserIcon } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import AuthConstellationCanvas from '../components/AuthConstellationCanvas';
import SEO from '../components/SEO';
import {
    buildAuthPageLink,
    clearStoredAuthRedirectIntent,
    consumeStoredAuthRedirectIntent,
    readAuthNextPath
} from '../utils/authRedirect';
import { getCurrentUser, signInWithGoogle, signOut, signUpWithEmail } from '../utils/auth';
import type { User } from '../utils/userManager';
import './AdminAuthPage.css';

const hasStaffAccess = (user: User | null) =>
    user?.role === 'admin' || user?.role === 'moderator';

const AdminSignupPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const nextPath = readAuthNextPath(location.search, '/admin/dashboard');
    const adminLoginPath = buildAuthPageLink('/admin/login', nextPath, '/admin/dashboard');
    const userSignupPath = buildAuthPageLink('/signup', '/stories');

    useEffect(() => {
        let isMounted = true;

        const syncAuth = async () => {
            const user = await getCurrentUser();
            if (!isMounted || !hasStaffAccess(user)) return;
            navigate(consumeStoredAuthRedirectIntent() || nextPath, { replace: true });
        };

        void syncAuth();
        return () => {
            isMounted = false;
        };
    }, [navigate, nextPath]);

    const handleGoogleSignup = async () => {
        setErrorMessage('');
        setInfoMessage('');
        setIsSubmitting(true);
        try {
            await signInWithGoogle(nextPath);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Google signup failed. Please try again.';
            setErrorMessage(message);
            setIsSubmitting(false);
        }
    };

    const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage('');
        setInfoMessage('');

        if (password !== confirmPassword) {
            setErrorMessage('Password and confirmation do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await signUpWithEmail(email, password, fullName);
            if (result.needsEmailConfirmation) {
                setInfoMessage('Account created. Verify your email, then sign in to continue.');
                return;
            }

            const user = await getCurrentUser();
            if (hasStaffAccess(user)) {
                clearStoredAuthRedirectIntent();
                navigate(nextPath, { replace: true });
                return;
            }

            await signOut();
            setInfoMessage('Signup completed. Ask a super admin to grant dashboard access for this account.');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Admin signup failed. Please try again.';
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-auth-page">
            <SEO
                title="Admin Signup | Mahean"
                description="Create an account for admin dashboard access."
                canonicalUrl="/admin/signup"
                noIndex
                noFollow
            />
            <AuthConstellationCanvas className="admin-auth-canvas" />

            <div className="admin-auth-shell">
                <div className="admin-auth-card">
                    <div className="admin-auth-brand">
                        <Link to="/" aria-label="Go to home">
                            <BrandLogo className="admin-auth-logo" alt="Mahean" />
                        </Link>
                    </div>

                    <div className="admin-auth-copy">
                        <span className="admin-auth-badge">Admin Portal</span>
                        <h1>Create staff account</h1>
                        <p>Register here for dashboard access. A super admin may still need to assign your final role.</p>
                    </div>

                    {errorMessage ? (
                        <div className="admin-auth-alert admin-auth-alert-error">{errorMessage}</div>
                    ) : null}
                    {infoMessage ? (
                        <div className="admin-auth-alert admin-auth-alert-info">{infoMessage}</div>
                    ) : null}

                    <button
                        type="button"
                        className="admin-auth-social-btn"
                        onClick={() => void handleGoogleSignup()}
                        disabled={isSubmitting}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
                        Continue with Google
                    </button>

                    <div className="admin-auth-divider">
                        <span>or</span>
                    </div>

                    <form className="admin-auth-form" onSubmit={handleSignup}>
                        <div className="admin-auth-field">
                            <label htmlFor="admin-signup-name">Full name</label>
                            <div className="admin-auth-input-wrap">
                                <UserIcon size={16} className="admin-auth-icon" />
                                <input
                                    id="admin-signup-name"
                                    type="text"
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                    placeholder="Your full name"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="admin-auth-field">
                            <label htmlFor="admin-signup-email">Email</label>
                            <div className="admin-auth-input-wrap">
                                <Mail size={16} className="admin-auth-icon" />
                                <input
                                    id="admin-signup-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="admin@domain.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="admin-auth-field">
                            <label htmlFor="admin-signup-password">Password</label>
                            <div className="admin-auth-input-wrap">
                                <KeyRound size={16} className="admin-auth-icon" />
                                <input
                                    id="admin-signup-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Choose a password"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="admin-auth-toggle"
                                    onClick={() => setShowPassword((previous) => !previous)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="admin-auth-field">
                            <label htmlFor="admin-signup-password-confirm">Confirm password</label>
                            <div className="admin-auth-input-wrap">
                                <KeyRound size={16} className="admin-auth-icon" />
                                <input
                                    id="admin-signup-password-confirm"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="admin-auth-toggle"
                                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="admin-auth-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating account...' : 'Create account'}
                        </button>
                    </form>

                    <p className="admin-auth-meta">
                        Already registered?
                        <Link to={adminLoginPath} className="admin-auth-meta-link">
                            Use admin login
                        </Link>
                    </p>
                    <p className="admin-auth-meta">
                        Looking for regular signup?
                        <Link to={userSignupPath} className="admin-auth-meta-link">
                            Use user signup
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSignupPage;
