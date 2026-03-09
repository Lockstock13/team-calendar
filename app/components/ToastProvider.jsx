"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Check, AlertCircle, Info, X, Bell } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-[400px]">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            index={index}
            total={toasts.length}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove, index, total }) {
  const { message, type } = toast;
  const [isShowing, setIsShowing] = useState(false);
  const [progress, setProgress] = useState(100);

  // Modern colors mapping
  const types = {
    success: {
      icon: Check,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      bar: "bg-emerald-500",
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      bar: "bg-red-500",
    },
    info: {
      icon: Info,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      bar: "bg-blue-500",
    },
    warning: {
      icon: AlertCircle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      bar: "bg-amber-500",
    },
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => setIsShowing(true), 10);

    // Progress bar logic
    const startTime = Date.now();
    const duration = 4000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 16);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Stacking effect
  const offset = (total - 1 - index) * 12;
  const scale = 1 - (total - 1 - index) * 0.05;
  const opacity = 1 - (total - 1 - index) * 0.2;

  return (
    <div
      className={`group pointer-events-auto relative w-full flex flex-col bg-background/80 backdrop-blur-xl border ${config.border} shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 ease-out transform ${
        isShowing
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-12 opacity-0 scale-90"
      }`}
      style={{
        marginBottom: index === total - 1 ? 0 : -35,
        zIndex: index,
        transform: `translateY(${-offset}px) scale(${scale})`,
        opacity: index < total - 3 ? 0 : opacity,
      }}
    >
      <div className="flex items-start gap-4 p-4 pr-12">
        <div
          className={`p-2 rounded-xl ${config.bg} flex-shrink-0 animate-pulse-subtle`}
        >
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-sm font-bold text-foreground mb-0.5 capitalize">
            {type === "success"
              ? "Success"
              : type === "error"
                ? "Error"
                : "Notification"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-[2px] w-full bg-muted mt-auto overflow-hidden">
        <div
          className={`h-full ${config.bar} transition-all duration-150 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
