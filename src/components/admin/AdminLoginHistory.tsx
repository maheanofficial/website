import { useState, useEffect } from 'react';
import { ShieldCheck, Monitor, Clock, Globe } from 'lucide-react';
import { getLoginLogs, type LoginLog } from '../../utils/loginHistoryManager';

const AdminLoginHistory = () => {
    const [logs, setLogs] = useState<LoginLog[]>([]);

    useEffect(() => {
        setLogs(getLoginLogs());
    }, []);

    return (
        <div className="admin-section">
            <h2 className="admin-section-title">
                <ShieldCheck size={24} className="text-teal-400 opacity-90" /> Login History
            </h2>

            <div className="admin-card full-width">
                <h3 className="card-title">Recent Login Attempts ({logs.length})</h3>

                {logs.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No login records found.</p>
                    </div>
                ) : (
                    <div className="story-list-scroll" style={{ maxHeight: '600px' }}>
                        {logs.map((log) => (
                            <div key={log.id} className="list-item">
                                <div className="list-item-avatar bg-white/5 flex items-center justify-center">
                                    <Monitor size={20} className={log.status === 'Success' ? 'text-green-400' : 'text-red-400'} />
                                </div>
                                <div className="list-item-info flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="item-title text-base flex items-center gap-2">
                                            {log.device}
                                            <span className={`text-xs px-2 py-0.5 rounded ${log.status === 'Success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {log.status}
                                            </span>
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Globe size={12} /> {log.ip}
                                            </span>
                                            {log.location && (
                                                <span className="text-[10px] text-gray-500">{log.location}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock size={12} /> {log.timestamp}
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

export default AdminLoginHistory;
