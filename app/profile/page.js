"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Save } from "lucide-react";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
  "#475569",
  "#1e293b",
];

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    color: "",
    telegram_chat_id: "",
  });
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/");
        return;
      }
      setSession(session);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (prof) {
        setProfile(prof);
        setForm({
          full_name: prof.full_name || "",
          color: prof.color || COLORS[9],
          telegram_chat_id: prof.telegram_chat_id || "",
        });
      }
      setLoading(false);
    });
  }, []);

  const saveProfile = async () => {
    if (!session) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        color: form.color,
        telegram_chat_id: form.telegram_chat_id || null,
      })
      .eq("id", session.user.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Gagal menyimpan: " + error.message);
    }
  };

  const changePassword = async () => {
    if (passwords.new.length < 6) {
      setPwMsg("Password minimal 6 karakter.");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPwMsg("Password tidak cocok.");
      return;
    }
    setSavingPw(true);
    setPwMsg("");
    const { error } = await supabase.auth.updateUser({
      password: passwords.new,
    });
    setSavingPw(false);
    if (error) {
      setPwMsg("Gagal: " + error.message);
    } else {
      setPwMsg("✅ Password berhasil diubah!");
      setPasswords({ new: "", confirm: "" });
    }
  };

  const initial = (form.full_name || session?.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-semibold">Profil Saya</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Avatar preview */}
        <div className="bg-background border rounded-2xl p-6 flex flex-col items-center gap-3">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md transition-all"
            style={{ backgroundColor: form.color || "#64748b" }}
          >
            {initial}
          </div>
          <div className="text-center">
            <p className="font-semibold text-base">
              {form.full_name || "(Belum ada nama)"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {session?.user?.email}
            </p>
            {profile?.role === "admin" && (
              <span className="inline-block mt-1.5 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                👑 Admin
              </span>
            )}
          </div>
        </div>

        {/* Edit Info */}
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-sm">Informasi Akun</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Nama */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder="Nama kamu"
                className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            {/* Telegram Chat ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={form.telegram_chat_id}
                onChange={(e) =>
                  setForm({ ...form, telegram_chat_id: e.target.value })
                }
                placeholder="Contoh: 123456789"
                className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cari Chat ID kamu lewat{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  @userinfobot
                </a>{" "}
                di Telegram. Dipakai untuk notifikasi jadwal personal.
              </p>
            </div>

            {/* Warna */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Warna Profil
              </label>
              <div className="grid grid-cols-10 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
                    style={{ backgroundColor: c }}
                    title={c}
                  >
                    {form.color === c && (
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom hex input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={form.color || "#64748b"}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-8 h-8 rounded-lg border cursor-pointer p-0.5 bg-background"
                />
                <span className="text-xs text-muted-foreground">
                  Atau pilih warna custom
                </span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                  {form.color}
                </code>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              } disabled:opacity-50`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Tersimpan!
                </>
              ) : saving ? (
                "Menyimpan..."
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ganti Password */}
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-sm">Ganti Password</h2>
          </div>
          <div className="p-5 space-y-3">
            <input
              type="password"
              placeholder="Password baru (min. 6 karakter)"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            <input
              type="password"
              placeholder="Konfirmasi password baru"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
            {pwMsg && (
              <p
                className={`text-xs px-3 py-2 rounded-lg ${
                  pwMsg.startsWith("✅")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {pwMsg}
              </p>
            )}
            <button
              onClick={changePassword}
              disabled={savingPw || !passwords.new}
              className="w-full py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {savingPw ? "Memproses..." : "Ubah Password"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
