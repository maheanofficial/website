import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { User, Lock, Palette, Mail, Eye, EyeOff } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { getCurrentUser, updateCurrentUserPassword } from '../../utils/auth';
import { applyTheme, APPEARANCE_STORAGE_KEY } from '../../utils/theme';
import type { ThemeMode } from '../../utils/theme';
import { defaultProfile, loadStoredProfile, normalizeProfileData, saveStoredProfile, type ProfileSettings } from '../../utils/profileSettings';
import { updateUserProfile } from '../../utils/userManager';
import './AdminSettings.css';

const SETTINGS_BASE = '/admin/dashboard/settings';

const ProfilePanel = () => {
    const [profile, setProfile] = useState<ProfileSettings>(defaultProfile);
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error'>('success');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            const storedProfile = loadStoredProfile();
            if (storedProfile && isMounted) {
                setProfile(storedProfile);
            }

            const user = await getCurrentUser();
            if (!isMounted) return;

            if (user) {
                const fallbackProfile = normalizeProfileData({
                    name: user.displayName || '',
                    email: user.email || '',
                    avatar: user.photoURL || ''
                });
                const nextProfile = storedProfile ? { ...fallbackProfile, ...storedProfile } : fallbackProfile;

                if (isMounted) {
                    setProfile(nextProfile);
                }
                saveStoredProfile(nextProfile);
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleChange = (field: keyof ProfileSettings, value: string) => {
        setProfile(prev => {
            const nextProfile = { ...prev, [field]: value };
            saveStoredProfile(nextProfile);
            return nextProfile;
        });
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setStatus('');
        setStatusType('success');

        saveStoredProfile(profile);

        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('???? ????? ?????? ???? ???? ?????');
            }

            updateUserProfile(user.id, {
                displayName: profile.name || user.displayName,
                email: profile.email || user.email,
                photoURL: profile.avatar || user.photoURL,
                username: profile.username || user.username
            });

            setStatus('???????? ??? ??? ???????');
        } catch (err: any) {
            console.error('Failed to save profile', err);
            setStatusType('error');
            setStatus(err?.message || '???????? ??? ??? ???????');
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatus(''), 2500);
        }
    };

    return (
        <form className="settings-form" onSubmit={handleSave}>
            <div className="settings-avatar-row">
                <div className="settings-avatar-block">
                    <ImageUploader
                        value={profile.avatar}
                        onChange={(value) => handleChange('avatar', value)}
                        placeholder={profile.name || 'Profile'}
                        isRound={true}
                        containerClass="settings-avatar-uploader"
                    />
                    <span className="settings-avatar-note">???????? ??? ????? ????</span>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-header">
                    <h2>???????? ????</h2>
                    <p>????? ??? ?? ????? ?????? ????? ?????</p>
                </div>

                <div className="settings-field">
                    <label className="settings-label">???</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={profile.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="????? ???"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">????????</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={profile.username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        placeholder="username"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">????? ??????</label>
                    <div className="settings-input-with-icon">
                        <input
                            type="email"
                            className="settings-input"
                            value={profile.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="????? ?????"
                        />
                        <Mail size={16} className="settings-input-icon" />
                    </div>
                </div>

                <div className="settings-field">
                    <label className="settings-label">??? ?????</label>
                    <input
                        type="tel"
                        className="settings-input"
                        value={profile.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+8801XXXXXXXXX"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">???? ?????</label>
                    <input
                        type="date"
                        className="settings-input"
                        value={profile.dob}
                        onChange={(e) => handleChange('dob', e.target.value)}
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">?????</label>
                    <select
                        className="settings-select"
                        value={profile.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                    >
                        <option value="">????? ???????? ????</option>
                        <option value="male">?????</option>
                        <option value="female">????</option>
                        <option value="other">????????</option>
                    </select>
                </div>

                <div className="settings-field">
                    <label className="settings-label">????</label>
                    <textarea
                        className="settings-textarea"
                        rows={4}
                        value={profile.bio}
                        onChange={(e) => handleChange('bio', e.target.value)}
                        placeholder="????? ???????? ????????? ?????"
                    />
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-header">
                    <h3 className="settings-section-title">??????? ??????</h3>
                    <p className="settings-section-desc">????? ??????? ?????? ???????? ???? ????? ?????</p>
                </div>

                <div className="settings-field">
                    <label className="settings-label">?????? ??????</label>
                    <input
                        type="url"
                        className="settings-input"
                        value={profile.youtube}
                        onChange={(e) => handleChange('youtube', e.target.value)}
                        placeholder="?????? ??????"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">????? ??????</label>
                    <input
                        type="url"
                        className="settings-input"
                        value={profile.tiktok}
                        onChange={(e) => handleChange('tiktok', e.target.value)}
                        placeholder="????? ??????"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">?????? ??????</label>
                    <input
                        type="url"
                        className="settings-input"
                        value={profile.facebook}
                        onChange={(e) => handleChange('facebook', e.target.value)}
                        placeholder="?????? ??????"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">??????????? ??????</label>
                    <input
                        type="url"
                        className="settings-input"
                        value={profile.instagram}
                        onChange={(e) => handleChange('instagram', e.target.value)}
                        placeholder="??????????? ??????"
                    />
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-header">
                    <h3 className="settings-section-title">??????</h3>
                    <p className="settings-section-desc">????? ??????? ?????? ??? ?????</p>
                </div>

                <div className="settings-field">
                    <label className="settings-label">??????</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={profile.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="????? ??????"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">??? ???</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={profile.zip}
                        onChange={(e) => handleChange('zip', e.target.value)}
                        placeholder="????? ??????? ??? ???"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">???</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={profile.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="????? ???"
                    />
                </div>

                <div className="settings-field">
                    <label className="settings-label">???</label>
                    <input
                        type="text"
                        className="settings-input"
                        value={profile.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        placeholder="????? ???"
                    />
                </div>
            </div>

            <button type="submit" className="settings-save-btn" disabled={isSaving}>
                {isSaving ? '??? ?????...' : '??? ????'}
            </button>

            {status && (
                <div className={`settings-status ${statusType === 'error' ? 'error' : ''}`}>
                    {status}
                </div>
            )}
        </form>
    );
};

const PasswordPanel = () => {
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error'>('success');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSaving) return;

        if (newPassword.length < 6) {
            setStatusType('error');
            setStatus('?????????? ??????? ? ??????? ??? ????');
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatusType('error');
            setStatus('???? ?????????? ????? ???');
            return;
        }

        setIsSaving(true);
        setStatus('');

        try {
            if (!currentPassword) {
                throw new Error('??????? ?????????? ????');
            }

            if (currentPassword === newPassword) {
                throw new Error('???? ?????????? ???? ???????????? ???? ????? ??? ????');
            }

            await updateCurrentUserPassword(currentPassword, newPassword);

            setStatusType('success');
            setStatus('?????????? ????? ???????');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setStatus(''), 3000);
        } catch (err: any) {
            setStatusType('error');
            setStatus(err?.message || '?????????? ????? ??? ??????? ???? ?????? ?????');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form className="settings-form" onSubmit={handleSubmit}>
            <div className="settings-header">
                <h2>?????????? ????? ????</h2>
                <p>????? ?????????? ???????? ????? ???? ?????????, ????? ?????????? ??????? ?????</p>
            </div>

            <div className="settings-field">
                <label className="settings-label">??????? ??????????</label>
                <div className="settings-input-group">
                    <input
                        type={showCurrent ? 'text' : 'password'}
                        className="settings-input"
                        placeholder="??????? ??????????"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        className="settings-eye-btn"
                        onClick={() => setShowCurrent(!showCurrent)}
                        aria-label="Toggle current password"
                    >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <div className="settings-field">
                <label className="settings-label">???? ??????????</label>
                <div className="settings-input-group">
                    <input
                        type={showNew ? 'text' : 'password'}
                        className="settings-input"
                        placeholder="???? ??????????"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        className="settings-eye-btn"
                        onClick={() => setShowNew(!showNew)}
                        aria-label="Toggle new password"
                    >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <div className="settings-field">
                <label className="settings-label">?????????? ??????? ????</label>
                <div className="settings-input-group">
                    <input
                        type={showConfirm ? 'text' : 'password'}
                        className="settings-input"
                        placeholder="?????????? ??????? ????"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        className="settings-eye-btn"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label="Toggle confirm password"
                    >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <button type="submit" className="settings-save-btn" disabled={isSaving}>
                {isSaving ? '????? ?????...' : '?????????? ??????? ????'}
            </button>

            {status && (
                <div className={`settings-status ${statusType === 'error' ? 'error' : ''}`}>
                    {status}
                </div>
            )}
        </form>
    );
};

const AppearancePanel = () => {
    const [appearance, setAppearance] = useState<ThemeMode>('system');
    const [status, setStatus] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            setAppearance(stored);
        }
    }, []);

    const handleSave = (event: React.FormEvent) => {
        event.preventDefault();
        localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
        applyTheme(appearance);
        setStatus('অ্যাপিয়ারেন্স সেভ করা হয়েছে।');
        setTimeout(() => setStatus(''), 2000);
    };

    return (
        <form className="settings-form" onSubmit={handleSave}>
            <div className="settings-header">
                <h2>অ্যাপিয়ারেন্স</h2>
                <p>আপনার পছন্দের থিম নির্বাচন করুন।</p>
            </div>

            <div className="settings-radio-group">
                <label className="settings-radio">
                    <input
                        type="radio"
                        name="appearance"
                        value="light"
                        checked={appearance === 'light'}
                        onChange={(e) => setAppearance(e.target.value as ThemeMode)}
                    />
                    <span>লাইট</span>
                </label>
                <label className="settings-radio">
                    <input
                        type="radio"
                        name="appearance"
                        value="dark"
                        checked={appearance === 'dark'}
                        onChange={(e) => setAppearance(e.target.value as ThemeMode)}
                    />
                    <span>ডার্ক</span>
                </label>
                <label className="settings-radio">
                    <input
                        type="radio"
                        name="appearance"
                        value="system"
                        checked={appearance === 'system'}
                        onChange={(e) => setAppearance(e.target.value as ThemeMode)}
                    />
                    <span>সিস্টেম</span>
                </label>
            </div>

            <button type="submit" className="settings-save-btn">
                সেভ করুন
            </button>

            {status && <div className="settings-status">{status}</div>}
        </form>
    );
};

const SettingsFallback = () => {
    const location = useLocation();
    const pathname = location.pathname;
    const target = pathname.includes('/appearance')
        ? `${SETTINGS_BASE}/appearance`
        : pathname.includes('/password')
            ? `${SETTINGS_BASE}/password`
            : `${SETTINGS_BASE}/profile`;

    return <Navigate to={target} replace />;
};

const AdminSettings = () => {
    return (
        <div className="admin-settings-layout">
            <aside className="settings-sidebar">
                <div className="settings-sidebar-title">সেটিংস</div>
                <p className="settings-sidebar-desc">আপনার অ্যাকাউন্ট সেটিংস পরিচালনা করুন</p>
                <nav className="settings-links">
                    <NavLink to={`${SETTINGS_BASE}/profile`} className={({ isActive }) => `settings-link ${isActive ? 'active' : ''}`}>
                        <User size={16} />
                        প্রোফাইল
                    </NavLink>
                    <NavLink to={`${SETTINGS_BASE}/password`} className={({ isActive }) => `settings-link ${isActive ? 'active' : ''}`}>
                        <Lock size={16} />
                        পাসওয়ার্ড
                    </NavLink>
                    <NavLink to={`${SETTINGS_BASE}/appearance`} className={({ isActive }) => `settings-link ${isActive ? 'active' : ''}`}>
                        <Palette size={16} />
                        অ্যাপিয়ারেন্স
                    </NavLink>
                </nav>
            </aside>

            <section className="settings-panel">
                <Routes>
                    <Route index element={<Navigate to={`${SETTINGS_BASE}/profile`} replace />} />
                    <Route path="profile" element={<ProfilePanel />} />
                    <Route path="password" element={<PasswordPanel />} />
                    <Route path="appearance" element={<AppearancePanel />} />
                    <Route path="*" element={<SettingsFallback />} />
                </Routes>
            </section>
        </div>
    );
};

export default AdminSettings;
