import { supabase } from '../lib/supabase';

export interface LoginLog {
    id: string;
    timestamp: string;
    ip: string;
    location?: string;
    device: string;
    status: 'Success' | 'Failed';
}

const STORAGE_KEY = 'mahean_login_history';
const LOGIN_TABLE = 'login_history';

type LoginHistoryRow = {
    id: string;
    timestamp?: string | null;
    ip?: string | null;
    location?: string | null;
    device?: string | null;
    status: LoginLog['status'];
};

const formatLoginTimestamp = (value?: string | null) => {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const mapRowToLoginLog = (row: LoginHistoryRow): LoginLog => ({
    id: row.id,
    timestamp: formatLoginTimestamp(row.timestamp),
    ip: row.ip ?? 'Unknown',
    location: row.location ?? undefined,
    device: row.device ?? 'Unknown Device',
    status: row.status
});

const storeLoginLogs = (logs: LoginLog[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

const getLocalLoginLogs = (): LoginLog[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

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

export const getLoginLogs = async (): Promise<LoginLog[]> => {
    const localLogs = getLocalLoginLogs();
    try {
        const { data, error } = await supabase
            .from(LOGIN_TABLE)
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const logs = (data || []).map(mapRowToLoginLog);
        storeLoginLogs(logs);
        return logs;
    } catch (error) {
        console.warn('Supabase login history fetch failed', error);
        return localLogs;
    }
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

    const logs = getLocalLoginLogs();
    const newLog: LoginLog = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: formatLoginTimestamp(),
        ip,
        location,
        device,
        status: success ? 'Success' : 'Failed'
    };

    const updatedLogs = [newLog, ...logs].slice(0, 100);
    storeLoginLogs(updatedLogs);

    try {
        const { error } = await supabase
            .from(LOGIN_TABLE)
            .insert({
                id: newLog.id,
                ip: newLog.ip,
                location: newLog.location ?? null,
                device: newLog.device,
                status: newLog.status,
                timestamp: new Date().toISOString()
            });
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase login history insert failed', error);
    }
};
