"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflineScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setShowContent(true);

    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showContent) {
    return null;
  }

  if (isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-emerald-900">
            Koneksi Kembali!
          </h2>
          <p className="text-sm text-emerald-700">Memuat ulang halaman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-6 shadow-lg">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <WifiOff className="w-8 h-8 text-slate-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Tidak Ada Koneksi
          </h1>
          <p className="text-sm text-slate-600">
            Anda sedang offline. Beberapa fitur mungkin tidak tersedia. Periksa
            koneksi internet Anda.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <p className="text-xs text-blue-900 font-medium mb-2">💡 Tips:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Data yang sudah dimuat akan tetap tersedia</li>
            <li>• Perubahan akan disinkronkan saat online</li>
            <li>• Tunggu koneksi untuk refresh</li>
          </ul>
        </div>

        <button
          onClick={() => {
            setIsOnline(navigator.onLine);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Periksa Koneksi
        </button>

        <a
          href="/"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ke Halaman Utama
        </a>
      </div>
    </div>
  );
}
