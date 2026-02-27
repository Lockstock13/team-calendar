"use client";

import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-center space-y-4 my-8 mx-auto max-w-lg">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 flex items-center justify-center rounded-2xl text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="font-bold text-red-700 dark:text-red-400">Terjadi Kesalahan</h3>
                        <p className="text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">
                            Gagal memuat komponen ini. Silakan coba muat ulang halaman.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Muat Ulang Halaman
                    </button>
                    <pre className="text-[10px] text-red-500/50 overflow-auto max-w-full italic font-mono p-2">
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
