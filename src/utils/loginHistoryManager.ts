// import { supabase } from '../lib/supabase';

export interface LoginLog {
    id: string;
    timestamp: string;
    ip: string;
    location?: string;
    device: string;
    status: 'Success' | 'Failed';
}

const STORAGE_KEY = 'mahean_login_history';

const fetchIPData = async (): Promise<{ ip: string, location?: string }> => {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            return {
                ip: data.ip,
                location: `${data.city}, ${data.country_name}`
            };
        }
    } catch (e) {
        console.warn('IP fetch failed', e);
    }

    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (response.ok) {
            const data = await response.json();
            return { ip: data.ip };
        }
    } catch (e) {
        console.warn('IP fetch failed', e);
    }

    return { ip: 'Unknown' };
};

export const getLoginLogs = (): LoginLog[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const logLoginAttempt = async (success: boolean) => {
    const { ip, location } = await fetchIPData();

    const ua = navigator.userAgent;
    let device = 'Unknown Device';
    if (ua.includes('Win')) device = 'Windows PC';
    else if (ua.includes('Mac')) device = 'Mac';
    else if (ua.includes('Linux')) device = 'Linux PC';
    else if (ua.includes('Android')) device = 'Android Device';
    else if (ua.includes('iPhone') || ua.includes('iPad')) device = 'iOS Device';

    const logs = getLoginLogs();
    const newLog: LoginLog = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toLocaleString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }),
        ip,
        location,
        device,
        status: success ? 'Success' : 'Failed'
    };

    const updatedLogs = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
};
