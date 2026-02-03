// import { supabase } from '../lib/supabase';

export interface ActivityLogItem {
    id: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'permanent_delete' | 'login' | 'empty_trash';
    targetType: 'story' | 'author' | 'category' | 'system';
    description: string;
    user: string;
    timestamp: string;
}

const STORAGE_KEY = 'mahean_activity_logs';

export const getActivityLogs = (): ActivityLogItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const logActivity = async (
    action: ActivityLogItem['action'],
    targetType: ActivityLogItem['targetType'],
    description: string,
    user: string = 'Admin'
) => {
    const logs = getActivityLogs();
    const newLog: ActivityLogItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        action,
        targetType,
        description,
        user,
        timestamp: new Date().toLocaleString('bn-BD', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    };

    const updatedLogs = [newLog, ...logs].slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
};
