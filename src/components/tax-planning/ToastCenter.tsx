'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { cn } from '@/lib/utils/cn';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// =====================================================================
// Types
// =====================================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  /** Show a toast notification */
  addToast: (type: ToastType, message: string) => void;
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
}

// =====================================================================
// Context
// =====================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access the toast notification system.
 * Must be used within a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// =====================================================================
// Toast Item
// =====================================================================

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-success-700" />,
  error: <AlertCircle className="h-5 w-5 text-critical-700" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning-700" />,
  info: <Info className="h-5 w-5 text-info-700" />,
};

const BG_MAP: Record<ToastType, string> = {
  success: 'bg-success-100 border-success-300',
  error: 'bg-critical-100 border-critical-300',
  warning: 'bg-warning-100 border-warning-300',
  info: 'bg-info-100 border-info-300',
};

const TEXT_MAP: Record<ToastType, string> = {
  success: 'text-success-700',
  error: 'text-critical-700',
  warning: 'text-warning-700',
  info: 'text-info-700',
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md animate-in slide-in-from-right-full duration-300',
        BG_MAP[toast.type]
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{ICON_MAP[toast.type]}</span>
      <p className={cn('flex-1 text-sm font-medium', TEXT_MAP[toast.type])}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'flex-shrink-0 rounded p-0.5 transition-colors hover:bg-surface-subtle0',
          TEXT_MAP[toast.type]
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// =====================================================================
// ToastProvider (Provider + Renderer)
// =====================================================================

let toastCounter = 0;

export interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      toastCounter += 1;
      const id = `toast-${toastCounter}-${Date.now()}`;
      const newToast: Toast = { id, type, message };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        removeToast(id);
      }, 5000);

      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const currentTimers = timersRef.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 w-full max-w-sm"
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={removeToast}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';

// =====================================================================
// Standalone ToastCenter (for use without provider pattern)
// =====================================================================

export interface ToastCenterProps {
  /** Children that can use the useToast hook */
  children: React.ReactNode;
}

export const ToastCenter: React.FC<ToastCenterProps> = ({ children }) => {
  return <ToastProvider>{children}</ToastProvider>;
};

ToastCenter.displayName = 'ToastCenter';
