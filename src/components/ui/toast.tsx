"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };
type ToastContextValue = {
  dismiss: (id: number) => void;
  toast: (message: string, kind?: ToastKind) => void;
  toasts: Toast[];
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    setToasts((current) => [
      ...current,
      { id: Date.now() + current.length, kind, message },
    ]);
  }, []);
  const value = useMemo(() => ({ dismiss, toast, toasts }), [dismiss, toast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context)
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  return context;
}

export function ToastViewport() {
  const context = useContext(ToastContext);
  if (!context) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[70] flex w-[min(23rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-5"
      aria-atomic="true"
      aria-live="polite"
    >
      {context.toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={context.dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 4200);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);

  const error = toast.kind === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={
        error
          ? "pointer-events-auto flex items-start gap-3 rounded-2xl border border-destructive/25 bg-card px-4 py-3 text-sm shadow-[0_18px_40px_-20px_rgb(32_42_58_/_0.5)] animate-in fade-in slide-in-from-bottom-2 duration-200"
          : "pointer-events-auto flex items-start gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3 text-sm shadow-[0_18px_40px_-20px_rgb(32_42_58_/_0.5)] animate-in fade-in slide-in-from-bottom-2 duration-200"
      }
    >
      {error ? (
        <CircleAlert className="mt-0.5 shrink-0 text-destructive" size={18} />
      ) : (
        <CheckCircle2
          className="mt-0.5 shrink-0 text-success-foreground"
          size={18}
        />
      )}
      <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}
