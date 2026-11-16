import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icon, IconName } from '../Icon/Icon';
import './Toast.css';

export type ToastType = 'love' | 'success' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type = 'love', duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, title, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const getIconName = (type: ToastType): IconName => {
    switch (type) {
      case 'love':
        return 'heart-filled';
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert';
      case 'info':
        return 'sparkles';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Уведомления">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`toast-item toast-item--${toast.type || 'love'}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-item__icon" aria-hidden="true">
              <Icon name={getIconName(toast.type || 'love')} size={18} />
            </span>
            <div className="toast-item__content">
              <h4 className="toast-item__title">{toast.title}</h4>
              {toast.message && <p className="toast-item__message">{toast.message}</p>}
            </div>
            <button
              type="button"
              className="toast-item__close"
              aria-label="Закрыть уведомление"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
