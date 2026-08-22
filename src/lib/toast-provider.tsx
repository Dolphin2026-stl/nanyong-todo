'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

type ToastContextType = ReturnType<typeof useToast>;

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAppToast 必须在 ToastProvider 中使用');
  }
  return context;
}

function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: Array<{ id: string; type: string; message: string }>;
  onRemove: (id: string) => void;
}) {
  const typeStyles: Record<string, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const typeIcons: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg animate-fade-in ${typeStyles[toast.type]}`}
          onClick={() => onRemove(toast.id)}
        >
          <span className="text-lg leading-none mt-0.5">{typeIcons[toast.type]}</span>
          <p className="text-sm flex-1">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
