'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './Toast.css';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  exiting?: boolean;
}

interface ToastContextType {
  showToast: (type: Toast['type'], title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const ICONS: Record<Toast['type'], string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback(
    (type: Toast['type'], title: string, message?: string) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" suppressHydrationWarning>
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
            <span className="toast-icon">{ICONS[toast.type]}</span>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
