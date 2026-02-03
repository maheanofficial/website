import { useState, useEffect } from 'react';
import { Activity, Clock, User, Shield } from 'lucide-react';
import { getActivityLogs, type ActivityLogItem } from '../../utils/activityLogManager';

const AdminActivityLog = () => {
    const [logs, setLogs] = useState<ActivityLogItem[]>([]);

    useEffect(() => {
        setLogs(getActivityLogs());
    }, []);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'text-green-400';
            case 'update': return 'text-blue-400';
            case 'delete': return 'text-orange-400';
            case 'permanent_delete': return 'text-red-500';
            case 'restore': return 'text-indigo-400';
            default: return 'text-gray-400';
        }
    };

    const getActionIcon = (action: string) => {
        // You could add map icons here, currently text is enough
        return action.replace('_', ' ').toUpperCase();
    };

    return (
        <div className="admin-section">
            <h2 className="admin-section-title">
                <Shield size={24} className="text-blue-400 opacity-90" /> Activity Log
            </h2>

            <div className="admin-card full-width">
                <h3 className="card-title">System Activities ({logs.length})</h3>

                {logs.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Activity size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No activity recorded yet.</p>
                    </div>
                ) : (
                    <div className="story-list-scroll" style={{ maxHeight: '600px' }}>
                        {logs.map((log) => (
                            <div key={log.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                                <div className="list-item-avatar bg-white/5 flex items-center justify-center">
                                    <Activity size={20} className={getActionColor(log.action)} />
                                </div>
                                <div className="list-item-info flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="item-title text-base">{log.description}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded bg-white/5 ${getActionColor(log.action)}`}>
                                            {getActionIcon(log.action)}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <User size={12} /> {log.user}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {log.timestamp}
                                        </span>
                                        <span className="uppercase tracking-wider opacity-70">
                                            {log.targetType}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminActivityLog;
