import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SEO from '../components/SEO';
import './SubmitStoryPage.css'; // Reusing login styles

const UpdatePasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a session (Supabase sets this automatically from the magic link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, they might have clicked a link but something went wrong, or navigated here manually.
                setError('ইনভ্যালিড বা মেয়াদোত্তীর্ণ লিংক। অনুগ্রহ করে আবার রিসেট রিকোয়েস্ট পাঠান।');
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            setError('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
            return;
        }

        if (password !== confirmPassword) {
            setError('পাসওয়ার্ড দুটি মিলছে না।');
            return;
        }

        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setMessage('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...');

            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="author-portal-page">
            <SEO title="নতুন পাসওয়ার্ড সেট করুন - মাহিয়ানের গল্পকথা" description="আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড সেট করুন।" />

            {/* Reusing the canvas background logic would require exporting it or copying. 
                For simplicity in this standalone component, we'll keep the background black as per CSS. 
            */}

            <div className="portal-content-wrapper">
                <div className="portal-header">
                    <div className="portal-brand-center">
                        <img src="/assets/logo.png" alt="মাহিয়ানের গল্পকথা" className="portal-logo" />
                    </div>
                </div>

                <div className="login-card-glass">
                    <div className="login-header">
                        <h2>নতুন পাসওয়ার্ড সেট করুন</h2>
                        <p>আপনার অ্যাকাউন্টের জন্য একটি শক্তিশালী পাসওয়ার্ড দিন</p>
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
                            <label>নতুন পাসওয়ার্ড</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    placeholder="নতুন পাসওয়ার্ড দিন"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <Lock size={18} className="input-icon" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>পাসওয়ার্ড নিশ্চিত করুন</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    placeholder="পাসওয়ার্ড আবার লিখুন"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <Lock size={18} className="input-icon" />
                            </div>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={isLoading}>
                            {isLoading ? 'আপডেট করা হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordPage;
