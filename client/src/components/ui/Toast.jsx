import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const safeString = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val.message === 'string') return val.message;
    if (typeof val.error === 'string') return val.error;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  };

  const addToast = useCallback(
    (payload, maybeType = 'info', duration = 4000) => {
      let title = '';
      let message = '';
      let type = maybeType;
      let toastDuration = duration;

      if (typeof payload === 'string') {
        message = payload;
        type = maybeType || 'info';
      } else if (payload && typeof payload === 'object') {
        title = safeString(payload.title);
        message = safeString(payload.message || payload.error || (payload instanceof Error ? payload.message : ''));
        if (!message && !title) {
          message = safeString(payload);
        }
        type = payload.type || maybeType || 'info';
        toastDuration = payload.duration || duration;
      }

      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, title: safeString(title), message: safeString(message), type }]);

      if (toastDuration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toastDuration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-[#4F6B4A] shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-[#A4493D] shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-[#B08D57] shrink-0" />,
            info: <Info className="w-4 h-4 text-[#2E2622] shrink-0" />,
          };

          const borders = {
            success: 'border-l-4 border-l-[#4F6B4A]',
            error: 'border-l-4 border-l-[#A4493D]',
            warning: 'border-l-4 border-l-[#B08D57]',
            info: 'border-l-4 border-l-[#2E2622]',
          };

          const displayTitle = safeString(toast.title);
          const displayMessage = safeString(toast.message);

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 bg-[#FAF8F4] border border-[#DDD8CF] ${borders[toast.type] || 'border-l-4 border-l-[#2E2622]'} rounded-[2px] shadow-lg text-[#2E2622] transition-all`}
            >
              {icons[toast.type] || icons.info}
              <div className="flex-1 min-w-0">
                {displayTitle && <h5 className="text-xs font-semibold uppercase tracking-wider">{displayTitle}</h5>}
                {displayMessage && (
                  <p className="text-xs text-[#7A726A] mt-0.5 leading-relaxed">{displayMessage}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#7A726A] hover:text-[#2E2622] transition-colors p-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
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

export default ToastProvider;
