"use client";

import { useState } from "react";
import { Calendar, Eye, EyeOff } from "lucide-react";
import { APP_UPDATE_INFO } from "@/lib/update-info";

export default function AuthForm({ onAuth, loading, error }) {
  const [mode, setMode] = useState("login");
  const [data, setData] = useState({ email: "", password: "", full_name: "" });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Calendar className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Still Photo Team
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Jadwal Fotografer
          </p>
        </div>

        {/* Card */}
        <div className="bg-background border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="rounded-xl border bg-muted/30 px-3 py-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              App Version
            </p>
            <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-semibold">
              {APP_UPDATE_INFO.version}
            </span>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {[
              { id: "login", label: "Masuk" },
              { id: "register", label: "Daftar" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === id
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
                  placeholder="Nama Lengkap"
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
                placeholder="Password (min. 6 karakter)"
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
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
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
                className={`p-3 rounded-xl text-sm border ${
                  error.startsWith("✅")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/15 dark:text-red-400 dark:border-red-800"
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm disabled:opacity-50 transition-all hover:opacity-90 mt-1"
            >
              {loading
                ? "Loading..."
                : mode === "login"
                  ? "Masuk"
                  : "Daftar Akun"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Still Photo Team &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
