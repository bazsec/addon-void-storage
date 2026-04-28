import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

const STYLE: Record<ToastType, string> = {
    success: 'bg-green-950/90 border border-green-800/50 text-green-100',
    error: 'bg-red-950/90 border border-red-800/50 text-red-100',
    info: 'bg-blue-950/90 border border-blue-800/50 text-blue-100',
};

const ICON: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />,
};

let nextId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const remove = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => remove(id), 4000);
    }, [remove]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md animate-in slide-in-from-right-5 fade-in duration-300 min-w-[300px] max-w-[500px] ${STYLE[toast.type]}`}
                    >
                        {ICON[toast.type]}
                        <p className="flex-1 text-sm">{toast.message}</p>
                        <button
                            onClick={() => remove(toast.id)}
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
