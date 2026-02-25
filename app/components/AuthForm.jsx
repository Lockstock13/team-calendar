"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Logo from "./Logo";

export default function AuthForm({ onAuth, loading, error, lang = "id", appSettings }) {
  const [mode, setMode] = useState("login");
  const [data, setData] = useState({ email: "", password: "", full_name: "" });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          {appSettings?.logo_url ? (
            <div className="w-20 h-20 bg-muted/50 rounded-3xl mx-auto mb-4 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center p-2">
              <img src={appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Logo className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {appSettings?.app_name || "Team Calendar"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "id" ? "Portal Jadwal & Tugas" : "Task & Schedule Portal"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-background border rounded-2xl p-6 shadow-sm space-y-4">
          {/* Tab toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {[
              { id: "login", label: lang === "id" ? "Masuk" : "Log in" },
              { id: "register", label: lang === "id" ? "Daftar" : "Sign up" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAuth(mode, data);
            }}
            className="space-y-3"
          >
            {mode === "register" && (
              <div>
                <input
                  type="text"
                  placeholder={lang === "id" ? "Nama Lengkap" : "Full Name"}
                  value={data.full_name}
                  onChange={(e) =>
                    setData({ ...data, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  required
                />
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              required
            />

            {/* Password with toggle */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={
                  lang === "id"
                    ? "Password (min. 6 karakter)"
                    : "Password (min. 6 chars)"
                }
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                className="w-full px-3 py-2.5 pr-10 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={
                  showPassword
                    ? lang === "id"
                      ? "Sembunyikan password"
                      : "Hide password"
                    : lang === "id"
                      ? "Tampilkan password"
                      : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <div
                className={`p-3 rounded-xl text-sm border ${error.startsWith("✅")
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-600 border-red-100"
                  }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-95 mt-1"
            >
              {loading
                ? lang === "id"
                  ? "Memproses..."
                  : "Loading..."
                : mode === "login"
                  ? lang === "id"
                    ? "Masuk"
                    : "Log in"
                  : lang === "id"
                    ? "Daftar Akun"
                    : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {appSettings?.app_name || "Team Calendar"} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
