import { supabase } from '../lib/supabase';

export interface ActivityLogItem {
    id: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'permanent_delete' | 'login' | 'empty_trash';
    targetType: 'story' | 'author' | 'category' | 'system';
    description: string;
    user: string;
    timestamp: string;
}

const STORAGE_KEY = 'mahean_activity_logs';
const ACTIVITY_TABLE = 'activity_logs';

type ActivityLogRow = {
    id: string;
    action: ActivityLogItem['action'];
    target_type: ActivityLogItem['targetType'];
    description: string;
    user_name?: string | null;
    timestamp?: string | null;
};

const formatLogTimestamp = (value?: string) => {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleString('bn-BD', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const mapRowToLog = (row: ActivityLogRow): ActivityLogItem => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    description: row.description,
    user: row.user_name ?? 'Admin',
    timestamp: formatLogTimestamp(row.timestamp)
});

const storeActivityLogs = (logs: ActivityLogItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

const getLocalActivityLogs = (): ActivityLogItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getActivityLogs = async (): Promise<ActivityLogItem[]> => {
    const localLogs = getLocalActivityLogs();
    try {
        const { data, error } = await supabase
            .from(ACTIVITY_TABLE)
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const logs = (data || []).map(mapRowToLog);
        storeActivityLogs(logs);
        return logs;
    } catch (error) {
        console.warn('Supabase activity fetch failed', error);
        return localLogs;
    }
};

export const logActivity = async (
    action: ActivityLogItem['action'],
    targetType: ActivityLogItem['targetType'],
    description: string,
    user: string = 'Admin'
) => {
    const logs = getLocalActivityLogs();
    const newLog: ActivityLogItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        action,
        targetType,
        description,
        user,
        timestamp: formatLogTimestamp()
    };

    const updatedLogs = [newLog, ...logs].slice(0, 500);
    storeActivityLogs(updatedLogs);

    try {
        const { error } = await supabase
            .from(ACTIVITY_TABLE)
            .insert({
                id: newLog.id,
                action: newLog.action,
                target_type: newLog.targetType,
                description: newLog.description,
                user_name: newLog.user,
                timestamp: new Date().toISOString()
            });
        if (error) throw error;
    } catch (error) {
        console.warn('Supabase activity insert failed', error);
    }
};
