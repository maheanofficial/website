import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    leaving?: boolean;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalShowToast: ToastContextType['showToast'] | null = null;

export const setGlobalToastHandler = (handler: ToastContextType['showToast'] | null) => {
    globalShowToast = handler;
};

export const triggerToast = (message: string, type: ToastType = 'success', duration = 3500) => {
    globalShowToast?.(message, type, duration);
};

export const useToast = () => {
    const context = useContext(ToastContext);
    return context || { showToast: triggerToast };
};
