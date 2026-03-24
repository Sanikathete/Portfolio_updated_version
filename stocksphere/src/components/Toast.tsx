import { useCallback, useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

declare global {
  interface Window {
    __showToast?: (message: string, type?: ToastType) => void;
  }
}

let toastCounter = 0;

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    window.__showToast = showToast;
    return () => {
      delete window.__showToast;
    };
  }, [showToast]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {toasts.map((toast) => {
        const borderColor = toast.type === 'success' ? '#2ecc71' : toast.type === 'error' ? '#e74c3c' : '#7eb8f7';
        return (
          <div
            key={toast.id}
            style={{
              background: '#0d1428',
              borderLeft: `3px solid ${borderColor}`,
              padding: '12px 16px',
              borderRadius: 6,
              fontSize: 12,
              minWidth: 280,
              color: '#e2e8f0',
              animation: 'slideInToast 0.2s ease forwards',
              boxShadow: '0 14px 30px rgba(0,0,0,0.25)',
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
};

export const useToast = () => ({
  showToast: (message: string, type: ToastType = 'info') => window.__showToast?.(message, type),
});
