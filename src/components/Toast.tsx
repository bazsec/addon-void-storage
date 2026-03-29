import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md
              animate-in slide-in-from-right-5 fade-in duration-300
              ${toast.type === 'success' ? 'bg-green-950/90 border border-green-800/50 text-green-100' : ''}
              ${toast.type === 'error' ? 'bg-red-950/90 border border-red-800/50 text-red-100' : ''}
              ${toast.type === 'info' ? 'bg-blue-950/90 border border-blue-800/50 text-blue-100' : ''}
              min-w-[300px] max-w-[500px]
            `}
                    >
                        {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />}
                        {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />}
                        {toast.type === 'info' && <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />}
                        <p className="flex-1 text-sm">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
