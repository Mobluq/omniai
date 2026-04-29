"use client";

import {
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

export const OMNIAI_ERROR_EVENT = "omniai:error";

export type OmniAIErrorEventDetail = {
  title: string;
  description?: string;
};

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = Required<Pick<ToastInput, "title" | "variant" | "durationMs">> &
  Pick<ToastInput, "description"> & {
    id: string;
  };

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: "border-secondary/30 bg-card",
  error: "border-destructive/40 bg-card",
  warning: "border-accent/40 bg-card",
  info: "border-primary/30 bg-card",
};

const iconClasses: Record<ToastVariant, string> = {
  success: "text-secondary",
  error: "text-destructive",
  warning: "text-accent",
  info: "text-primary",
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = createToastId();
    const record: ToastRecord = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? "info",
      durationMs: input.durationMs ?? 5000,
    };

    setToasts((current) => [record, ...current].slice(0, 5));

    if (record.variant === "error" && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<OmniAIErrorEventDetail>(OMNIAI_ERROR_EVENT, {
          detail: {
            title: record.title,
            description: record.description,
          },
        }),
      );
    }

    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismissToast }), [dismissToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed left-3 right-3 top-3 z-[100] grid gap-3 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(92vw,420px)]"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const Icon = icons[item.variant];

  useEffect(() => {
    if (item.durationMs <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => onDismiss(item.id), item.durationMs);
    return () => window.clearTimeout(timeout);
  }, [item.durationMs, item.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 shadow-[0_18px_60px_rgba(17,20,24,0.14)]",
        "animate-in fade-in slide-in-from-top-2",
        variantClasses[item.variant],
      )}
      role={item.variant === "error" ? "alert" : "status"}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClasses[item.variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{item.title}</p>
        {item.description ? (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
