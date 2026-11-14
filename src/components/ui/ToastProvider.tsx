"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "error" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  error: () => {},
  success: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      setTimeout(() => {
        dismiss(id);
      }, 4500);
    },
    [dismiss]
  );

  const error = useCallback((m: string) => showToast(m, "error"), [showToast]);
  const success = useCallback((m: string) => showToast(m, "success"), [showToast]);
  const info = useCallback((m: string) => showToast(m, "info"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, error, success, info }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-md pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 ${
              t.variant === "error"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-100"
                : t.variant === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                : "bg-[#11141C]/95 border-white/15 text-slate-100"
            }`}
          >
            {t.variant === "error" ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : t.variant === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-brand-400 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
