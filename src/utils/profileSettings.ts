export const PROFILE_STORAGE_KEY = 'mahean_settings_profile';

export type ProfileSettings = {
    name: string;
    username: string;
    email: string;
    phone: string;
    dob: string;
    gender: string;
    bio: string;
    youtube: string;
    tiktok: string;
    facebook: string;
    instagram: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    avatar: string;
};

export const defaultProfile: ProfileSettings = {
    name: '',
    username: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    bio: '',
    youtube: '',
    tiktok: '',
    facebook: '',
    instagram: '',
    address: '',
    zip: '',
    city: '',
    country: '',
    avatar: ''
};

export const normalizeProfileData = (data?: Partial<ProfileSettings> | null): ProfileSettings => ({
    ...defaultProfile,
    name: data?.name ?? '',
    username: data?.username ?? '',
    email: data?.email ?? '',
    phone: data?.phone ?? '',
    dob: data?.dob ?? '',
    gender: data?.gender ?? '',
    bio: data?.bio ?? '',
    youtube: data?.youtube ?? '',
    tiktok: data?.tiktok ?? '',
    facebook: data?.facebook ?? '',
    instagram: data?.instagram ?? '',
    address: data?.address ?? '',
    zip: data?.zip ?? '',
    city: data?.city ?? '',
    country: data?.country ?? '',
    avatar: data?.avatar ?? ''
});

export const loadStoredProfile = (): ProfileSettings | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return null;

    try {
        return normalizeProfileData(JSON.parse(stored));
    } catch (error) {
        console.warn('Failed to parse stored profile data', error);
        return null;
    }
};

export const saveStoredProfile = (profile: ProfileSettings) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};
