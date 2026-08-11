import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { setGlobalToastHandler, ToastContext, type ToastMessage, type ToastType } from './toastContext';
import './Toast.css';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3500) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    useEffect(() => {
        setGlobalToastHandler(showToast);
        return () => {
            setGlobalToastHandler(null);
        };
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container" role="status" aria-live="polite">
                {toasts.map((toast) => {
                    const Icon =
                        toast.type === 'success' ? CheckCircle2 :
                        toast.type === 'info' ? Info :
                        toast.type === 'warning' ? AlertTriangle : XCircle;

                    return (
                        <div
                            key={toast.id}
                            className={`toast-item toast-${toast.type} ${toast.leaving ? 'toast-leaving' : ''}`}
                        >
                            <div className="toast-icon-box">
                                <Icon size={18} />
                            </div>
                            <div className="toast-content">{toast.message}</div>
                            <button
                                type="button"
                                className="toast-close-btn"
                                onClick={() => removeToast(toast.id)}
                                aria-label="বন্ধ করুন"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};
