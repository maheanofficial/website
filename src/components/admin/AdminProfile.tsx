import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SmartImage from '../SmartImage';
import { getCurrentUser } from '../../utils/auth';
import { defaultProfile, loadStoredProfile, normalizeProfileData, saveStoredProfile, type ProfileSettings } from '../../utils/profileSettings';
import './AdminProfile.css';

const genderLabels: Record<string, string> = {
    male: 'পুরুষ',
    female: 'নারী',
    other: 'অন্যান্য'
};

const normalizeUrl = (value: string) => {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
    }
    return `https://${value}`;
};

const AdminProfile = () => {
    const [profile, setProfile] = useState<ProfileSettings>(defaultProfile);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            const storedProfile = loadStoredProfile();
            if (storedProfile && isMounted) {
                setProfile(storedProfile);
            }

            const user = await getCurrentUser();
            if (!user || !isMounted) {
                if (isMounted) {
                    setError('সেশন পাওয়া যায়নি। আবার লগইন করুন।');
                    setIsLoading(false);
                }
                return;
            }
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

            if (isMounted) {
                setIsLoading(false);
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    const displayValue = (value: string) => (value?.trim() ? value : 'দেওয়া হয়নি');
    const displayGender = profile.gender ? (genderLabels[profile.gender] || profile.gender) : 'দেওয়া হয়নি';
    const displayUsername = profile.username ? `@${profile.username}` : 'ইউজারনেম দেওয়া হয়নি';
    const displayName = profile.name || profile.username || 'প্রোফাইল';

    const accountRows = [
        { label: 'পূর্ণ নাম', value: displayValue(profile.name) },
        { label: 'ইউজারনেম', value: displayUsername },
        { label: 'ইমেইল', value: displayValue(profile.email) }
    ];

    const contactRows = [
        { label: 'ফোন নম্বর', value: displayValue(profile.phone) },
        { label: 'জন্ম তারিখ', value: displayValue(profile.dob) },
        { label: 'লিঙ্গ', value: displayGender }
    ];

    const addressRows = [
        { label: 'ঠিকানা', value: displayValue(profile.address) },
        { label: 'শহর', value: displayValue(profile.city) },
        { label: 'জিপ কোড', value: displayValue(profile.zip) },
        { label: 'দেশ', value: displayValue(profile.country) }
    ];

    const socialRows = [
        { label: 'ইউটিউব', value: profile.youtube },
        { label: 'টিকটক', value: profile.tiktok },
        { label: 'ফেসবুক', value: profile.facebook },
        { label: 'ইনস্টাগ্রাম', value: profile.instagram }
    ];

    return (
        <div className="admin-profile-page">
            <div className="admin-profile-header">
                <div className="admin-profile-identity">
                    <div className="admin-profile-avatar">
                        <SmartImage
                            src={profile.avatar}
                            alt={displayName}
                            className="admin-profile-avatar-img"
                            isRound={true}
                            showFullText={true}
                        />
                    </div>
                    <div>
                        <h2 className="admin-profile-name">{displayName}</h2>
                        <div className="admin-profile-username">{displayUsername}</div>
                        <div className="admin-profile-meta">{displayValue(profile.email)}</div>
                    </div>
                </div>
                <Link to="/author/dashboard/settings/profile" className="admin-profile-edit">
                    প্রোফাইল এডিট
                </Link>
            </div>

            {isLoading && !error && (
                <div className="admin-profile-alert">প্রোফাইল লোড হচ্ছে...</div>
            )}
            {error && (
                <div className="admin-profile-alert error">{error}</div>
            )}

            <div className="admin-profile-grid">
                <div className="admin-profile-card">
                    <h3 className="admin-profile-card-title">অ্যাকাউন্ট তথ্য</h3>
                    <div className="admin-profile-list">
                        {accountRows.map((row) => (
                            <div className="admin-profile-row" key={row.label}>
                                <span>{row.label}</span>
                                <span>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-profile-card">
                    <h3 className="admin-profile-card-title">যোগাযোগ</h3>
                    <div className="admin-profile-list">
                        {contactRows.map((row) => (
                            <div className="admin-profile-row" key={row.label}>
                                <span>{row.label}</span>
                                <span>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-profile-card">
                    <h3 className="admin-profile-card-title">ঠিকানা</h3>
                    <div className="admin-profile-list">
                        {addressRows.map((row) => (
                            <div className="admin-profile-row" key={row.label}>
                                <span>{row.label}</span>
                                <span>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-profile-card">
                    <h3 className="admin-profile-card-title">সামাজিক মিডিয়া</h3>
                    <div className="admin-profile-list">
                        {socialRows.map((row) => (
                            <div className="admin-profile-row" key={row.label}>
                                <span>{row.label}</span>
                                {row.value?.trim() ? (
                                    <a href={normalizeUrl(row.value)} target="_blank" rel="noreferrer">
                                        {row.value}
                                    </a>
                                ) : (
                                    <span className="admin-profile-placeholder">দেওয়া হয়নি</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-profile-card full">
                    <h3 className="admin-profile-card-title">বায়ো</h3>
                    <p className="admin-profile-bio">{displayValue(profile.bio)}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
