"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGlobalContext } from "@/app/providers";
import { useToast } from "@/app/components/ToastProvider";
import {
  ArrowLeft,
  Check,
  Save,
  MessageCircle,
  Mail,
  Smartphone,
  Loader2,
  Globe,
} from "lucide-react";
import {
  getPushSupport,
  getPushUnsupportedLabel,
  urlBase64ToUint8Array,
  VAPID_PUBLIC_KEY,
} from "@/app/components/PushInit";

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

// â”€â”€â”€ Small helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-all duration-300 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed ${
        checked
          ? "bg-zinc-900 dark:bg-zinc-100"
          : "bg-zinc-200 dark:bg-zinc-800"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NotifRow({
  icon: Icon,
  iconColor,
  title,
  description,
  checked,
  onChange,
  disabled,
  badge,
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b last:border-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{title}</p>
          {badge && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProfilePage() {
  const router = useRouter();
  const { language, setLanguage } = useGlobalContext();
  const lang = language || "en";
  const { addToast } = useToast();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  // Profile form
  const [form, setForm] = useState({
    full_name: "",
    color: "",
    telegram_chat_id: "",
  });

  // Notification prefs (synced from DB, updated locally for instant UI)
  const [notif, setNotif] = useState({
    notif_push: false,
    notif_telegram: true,
    notif_email: false,
  });

  // UI state
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Push-specific state
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const pushSupport =
    typeof window !== "undefined"
      ? getPushSupport()
      : { supported: false, reason: "ssr" };

  // â”€â”€ Load session + profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        setNotif({
          notif_push: prof.notif_push === true,
          notif_telegram: prof.notif_telegram !== false, // default true
          notif_email: prof.notif_email === true,
        });
      }
      setLoading(false);
    });
  }, []);

  // â”€â”€ Save profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      addToast("Gagal menyimpan: " + error.message, "error");
    }
  };

  // â”€â”€ Change password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Push notification toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handlePushToggle = async (enable) => {
    if (!pushSupport.supported) return;
    setPushLoading(true);
    setPushMsg("");

    try {
      if (enable) {
        // Minta izin notifikasi
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushMsg(
            "⚠️ Izin notifikasi ditolak. Aktifkan di pengaturan browser.",
          );
          setPushLoading(false);
          return;
        }

        // Ambil service worker
        const sw = await navigator.serviceWorker.ready;

        // Subscribe ke push
        const subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Simpan langsung via Supabase client (pakai auth session -> RLS lolos)
        const { error } = await supabase
          .from("profiles")
          .update({
            push_subscription: subscription.toJSON(),
            notif_push: true,
          })
          .eq("id", session.user.id);

        if (error) throw new Error(error.message);

        setNotif((prev) => ({ ...prev, notif_push: true }));
        setPushMsg("✅ Push notification aktif!");
      } else {
        // Unsubscribe dari browser
        const sw = await navigator.serviceWorker.ready;
        const sub = await sw.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        // Hapus dari DB langsung via Supabase client
        const { error } = await supabase
          .from("profiles")
          .update({
            push_subscription: null,
            notif_push: false,
          })
          .eq("id", session.user.id);

        if (error) throw new Error(error.message);

        setNotif((prev) => ({ ...prev, notif_push: false }));
        setPushMsg("");
      }
    } catch (err) {
      setPushMsg("❌ " + err.message);
    } finally {
      setPushLoading(false);
    }
  };

  // â”€â”€ Telegram / Email toggle (just update DB preference) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleNotifToggle = async (key, value) => {
    if (!session) return;

    // Optimistic update
    setNotif((prev) => ({ ...prev, [key]: value }));

    const { error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("id", session.user.id);

    if (error) {
      // Revert on failure
      setNotif((prev) => ({ ...prev, [key]: !value }));
      addToast("Gagal menyimpan preferensi: " + error.message, "error");
    }
  };

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const initial = (form.full_name || session?.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  // Push description varies by support status
  const pushDescription = !pushSupport.supported
    ? `Tidak didukung: ${getPushUnsupportedLabel(pushSupport.reason)}`
    : Notification.permission === "denied"
      ? "Izin ditolak. Aktifkan notifikasi di pengaturan browser."
      : notif.notif_push
        ? "Notifikasi aktif di browser / PWA ini."
        : "Aktifkan untuk menerima notifikasi meski app ditutup.";

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
          <h1 className="text-base font-semibold">
            {lang === "id" ? "Profil Saya" : "My Profile"}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* â”€â”€ Avatar preview â”€â”€ */}
        <div className="bg-background border rounded-[2rem] p-10 flex flex-col items-center gap-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] relative transition-all duration-300">
          {/* Minimal top accent line */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-500"
            style={{ backgroundColor: form.color || "#64748b" }}
          />

          <div className="relative">
            {/* Clean border ring */}
            <div
              className="absolute -inset-1.5 rounded-full border border-current opacity-10 transition-all duration-500"
              style={{ color: form.color || "#64748b" }}
            />
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-semibold shadow-sm transition-all duration-500"
              style={{ backgroundColor: form.color || "#64748b" }}
            >
              {initial}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">
              {form.full_name ||
                (lang === "id" ? "(Belum ada nama)" : "(No Name)")}
            </h3>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              {session?.user?.email}
            </p>

            {profile?.role === "admin" && (
              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[12px]">👑</span>
                  Admin
                </span>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Edit Info â”€â”€ */}
        <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b bg-muted/10">
            <h2 className="text-sm font-semibold text-muted-foreground/85">
              {lang === "id" ? "Informasi Akun" : "Account Information"}
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Nama */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                {lang === "id" ? "Nama Lengkap" : "Full Name"}
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder={lang === "id" ? "Nama kamu" : "Your name"}
                className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all"
              />
            </div>

            {/* Warna */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                {lang === "id" ? "Warna Profil" : "Profile Color"}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 focus:outline-none relative"
                    style={{ backgroundColor: c }}
                    title={c}
                  >
                    {form.color === c && (
                      <div className="absolute inset-0 rounded-full border-2 border-background shadow-[0_0_0_2px_rgba(0,0,0,0.1)] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow-sm" />
                      </div>
                    )}
                  </button>
                ))}

                {/* Custom Color Circle */}
                <div className="relative w-8 h-8 group">
                  <input
                    type="color"
                    value={form.color || "#64748b"}
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="w-full h-full rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/10 group-hover:bg-muted/20 transition-all overflow-hidden"
                    style={{
                      backgroundColor:
                        form.color && !COLORS.includes(form.color)
                          ? form.color
                          : "transparent",
                    }}
                  >
                    {!COLORS.includes(form.color) && (
                      <Check className="w-4 h-4 text-white drop-shadow-sm z-0" />
                    )}
                    {COLORS.includes(form.color) && (
                      <span className="text-xs text-muted-foreground font-bold">
                        +
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 opacity-60">
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === "id" ? "Pilihan:" : "Selected:"}
                </span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono font-bold tracking-tight">
                  {form.color.toUpperCase()}
                </code>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] ${
                saved
                  ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                  : "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:opacity-90 shadow-md"
              } disabled:opacity-50`}
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  {lang === "id" ? "Berhasil disimpan" : "Saved successfully"}
                </>
              ) : saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {lang === "id" ? "Simpan perubahan" : "Save changes"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* â”€â”€ Antarmuka / Pengaturan â”€â”€ */}
        <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b bg-muted/10 flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold text-muted-foreground/85">
              {lang === "id" ? "Bahasa Antarmuka" : "Interface Language"}
            </h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {lang === "id" ? "Pilihan Bahasa" : "Language Preference"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {lang === "id"
                  ? "Ubah bahasa teks aplikasi utama"
                  : "Change the main application text language"}
              </p>
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
              <button
                onClick={() => setLanguage("en")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 ${
                  lang === "en"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("id")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 ${
                  lang === "id"
                    ? "bg-background text-foreground shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Indonesia
              </button>
            </div>
          </div>
        </div>

        {/* â”€â”€ Notifikasi â”€â”€ */}
        <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b bg-muted/10">
            <h2 className="text-sm font-semibold text-muted-foreground/85">
              {lang === "id" ? "Notifikasi" : "Notifications"}
            </h2>
            <p className="text-xs font-medium text-muted-foreground/65 mt-1">
              {lang === "id"
                ? "Media update & pengingat"
                : "Media updates & reminders"}
            </p>
          </div>

          <div className="px-6 divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Push */}
            <div className="py-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    notif.notif_push
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                  }`}
                >
                  {pushLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">
                          Push Notification
                        </p>
                        {!pushSupport.supported && (
                          <span className="text-[10px] font-semibold uppercase bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-md">
                            {lang === "id" ? "Offline" : "N/A"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {pushDescription}
                      </p>
                    </div>
                    <Toggle
                      checked={notif.notif_push}
                      onChange={handlePushToggle}
                      disabled={
                        pushLoading ||
                        !pushSupport.supported ||
                        (typeof Notification !== "undefined" &&
                          Notification.permission === "denied")
                      }
                    />
                  </div>
                  {pushMsg && (
                    <p
                      className={`text-xs mt-2 font-bold px-2 py-1 rounded-lg w-fit ${
                        pushMsg.startsWith("✅")
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                      }`}
                    >
                      {pushMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Telegram */}
            <div className="py-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    notif.notif_telegram
                      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">Telegram</p>
                        {!form.telegram_chat_id && notif.notif_telegram && (
                          <span className="text-[10px] font-semibold uppercase bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md animate-pulse">
                            {lang === "id" ? "ID BELUM ADA" : "MISSING ID"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.notif_telegram
                          ? form.telegram_chat_id
                            ? lang === "id"
                              ? `Aktif: ID ${form.telegram_chat_id}`
                              : `Active: ID ${form.telegram_chat_id}`
                            : lang === "id"
                              ? "Masukkan Chat ID di bawah."
                              : "Enter Chat ID below."
                          : lang === "id"
                            ? "Notifikasi Telegram nonaktif."
                            : "Telegram disabled."}
                      </p>
                    </div>
                    <Toggle
                      checked={notif.notif_telegram}
                      onChange={(v) => handleNotifToggle("notif_telegram", v)}
                    />
                  </div>

                  {/* Telegram Chat ID input - show when toggle is on */}
                  {notif.notif_telegram && (
                    <div className="mt-4 space-y-2">
                      <input
                        type="text"
                        value={form.telegram_chat_id}
                        onChange={(e) =>
                          setForm({ ...form, telegram_chat_id: e.target.value })
                        }
                        placeholder={
                          lang === "id"
                            ? "Contoh: 123456789"
                            : "Example: 123456789"
                        }
                        className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {lang === "id" ? "Gunakan" : "Use"}
                        </span>
                        <a
                          href="https://t.me/userinfobot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-bold hover:underline"
                        >
                          @userinfobot
                        </a>
                        <span className="text-xs text-muted-foreground font-medium">
                          {lang === "id" ? "lalu simpan." : "then save."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="py-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    notif.notif_email
                      ? "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                  }`}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">Email</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">
                        {notif.notif_email
                          ? lang === "id"
                            ? `Kirim ke ${session?.user?.email}`
                            : `Send to ${session?.user?.email}`
                          : lang === "id"
                            ? "Notifikasi email nonaktif."
                            : "Email disabled."}
                      </p>
                    </div>
                    <Toggle
                      checked={notif.notif_email}
                      onChange={(v) => handleNotifToggle("notif_email", v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Minimal Info Box */}
          <div className="m-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-3 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                {lang === "id" ? "Ketentuan" : "Information"}
              </p>
            </div>
            <ul className="space-y-1.5">
              {[
                lang === "id"
                  ? "Notifikasi dikirim otomatis saat jadwal berubah."
                  : "Auto-notifications on task updates.",
                lang === "id"
                  ? "Daily reminder mengikuti jadwal yang diatur admin."
                  : "Daily reminders follow the admin schedule.",
                lang === "id"
                  ? "Penting: Tambahkan ke Home Screen untuk iOS."
                  : "iOS: Must Add to Home Screen for Push.",
              ].map((text, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] text-muted-foreground leading-snug"
                >
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* â”€â”€ Ganti Password â”€â”€ */}
        <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b bg-muted/10">
            <h2 className="text-sm font-semibold text-muted-foreground/85">
              {lang === "id" ? "Ganti Password" : "Change Password"}
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <input
                type="password"
                placeholder={
                  lang === "id"
                    ? "Password baru (min. 6 karakter)"
                    : "New password (min. 6 chars)"
                }
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
              <input
                type="password"
                placeholder={
                  lang === "id"
                    ? "Konfirmasi password baru"
                    : "Confirm new password"
                }
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            {pwMsg && (
              <p
                className={`text-xs font-bold px-3 py-2 rounded-xl ${
                  pwMsg.startsWith("✅")
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                    : "bg-red-50 text-red-600 dark:bg-red-950/30"
                }`}
              >
                {pwMsg}
              </p>
            )}

            <button
              onClick={changePassword}
              disabled={savingPw || !passwords.new}
              className="w-full py-3.5 border border-border rounded-2xl text-sm font-semibold hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-30"
            >
              {savingPw ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : lang === "id" ? (
                "Ubah password sekarang"
              ) : (
                "Change password now"
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
