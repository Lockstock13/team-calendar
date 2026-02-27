"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [config, setConfig] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfig({
                ...options,
                resolve
            });
        });
    }, []);

    const handleClose = (value) => {
        if (config?.resolve) config.resolve(value);
        setConfig(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {config && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleClose(false)} />

                    <div className="bg-background w-full max-w-[360px] rounded-3xl border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="h-1.5 bg-red-500" />

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-2xl bg-red-100 text-red-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold">
                                    {config.title || "Are you sure?"}
                                </h3>
                            </div>

                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                {config.message}
                            </p>

                            <div className="flex gap-3 flex-wrap">
                                {config.buttons ? (
                                    config.buttons.map((btn, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleClose(btn.value)}
                                            className={`flex-1 px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all active:scale-95 shadow-sm min-w-[120px] ${btn.variant === "danger"
                                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
                                                : btn.variant === "primary"
                                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                                }`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleClose(false)}
                                            className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-2xl text-[13px] font-bold transition-all active:scale-95"
                                        >
                                            {config.cancelText || "Cancel"}
                                        </button>
                                        <button
                                            onClick={() => handleClose(true)}
                                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[13px] font-bold transition-all shadow-lg shadow-red-200 active:scale-95"
                                        >
                                            {config.confirmText || "Delete"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => handleClose(false)}
                            className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}
