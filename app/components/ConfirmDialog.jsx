"use client";

import { useEffect } from "react";
import { AlertTriangle, Info } from "lucide-react";

/**
 * ConfirmDialog — drop-in replacement for browser confirm() / alert().
 *
 * Usage example:
 *   const [dialog, setDialog] = useState(null);
 *
 *   // Confirm:
 *   setDialog({
 *     type: "confirm",
 *     title: "Hapus jadwal?",
 *     message: "Tindakan ini tidak dapat dibatalkan.",
 *     onConfirm: () => doDelete(id),
 *   });
 *
 *   // Alert / info:
 *   setDialog({
 *     type: "alert",
 *     title: "Perhatian",
 *     message: "Pilih minimal 1 fotografer.",
 *   });
 *
 *   {dialog && (
 *     <ConfirmDialog {...dialog} onClose={() => setDialog(null)} />
 *   )}
 */
export default function ConfirmDialog({
    type = "confirm",      // "confirm" | "alert"
    title,
    message,
    confirmLabel = "Ya, Lanjutkan",
    cancelLabel = "Batal",
    danger = true,         // red confirm button vs primary
    onConfirm,
    onClose,
}) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleConfirm = () => {
        onConfirm?.();
        onClose?.();
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-background border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-dialog-in"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                {/* Icon + Title */}
                <div className="flex items-start gap-3">
                    <div
                        className={`p-2.5 rounded-xl flex-shrink-0 ${danger
                                ? "bg-red-100 dark:bg-red-500/15"
                                : "bg-blue-100 dark:bg-blue-500/15"
                            }`}
                    >
                        {danger ? (
                            <AlertTriangle
                                className={`w-5 h-5 ${danger
                                        ? "text-red-500 dark:text-red-400"
                                        : "text-blue-500 dark:text-blue-400"
                                    }`}
                            />
                        ) : (
                            <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        {title && (
                            <h3 id="dialog-title" className="font-semibold text-base leading-snug">
                                {title}
                            </h3>
                        )}
                        {message && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {message}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    {type === "confirm" && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={type === "confirm" ? handleConfirm : onClose}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 ${danger && type === "confirm"
                                ? "bg-red-500 text-white"
                                : "bg-primary text-primary-foreground"
                            }`}
                    >
                        {type === "confirm" ? confirmLabel : "OK"}
                    </button>
                </div>
            </div>
        </div>
    );
}
