"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Save,
  Bell,
  BellOff,
  MessageCircle,
  Mail,
  Smartphone,
  Loader2,
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

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-emerald-500" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
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

  // ── Load session + profile ──────────────────────────────────────────────────

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

  // ── Save profile ────────────────────────────────────────────────────────────

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

  // ── Change password ─────────────────────────────────────────────────────────

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

  // ── Push notification toggle ────────────────────────────────────────────────

  const handlePushToggle = async (enable) => {
    if (!pushSupport.supported) return;
    setPushLoading(true);
    setPushMsg("");

    try {
      if (enable) {
        // Ask permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushMsg(
            "⚠️ Izin notifikasi ditolak. Aktifkan di pengaturan browser.",
          );
          setPushLoading(false);
          return;
        }

        // Get service worker registration
        const sw = await navigator.serviceWorker.ready;

        // Subscribe
        const subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Save to server
        const res = await fetch("/api/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            subscription: subscription.toJSON(),
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menyimpan subscription");
        }

        setNotif((prev) => ({ ...prev, notif_push: true }));
        setPushMsg("✅ Push notification aktif!");
      } else {
        // Unsubscribe from browser
        const sw = await navigator.serviceWorker.ready;
        const sub = await sw.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        // Remove from server
        await fetch("/api/push-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id }),
        });

        setNotif((prev) => ({ ...prev, notif_push: false }));
        setPushMsg("");
      }
    } catch (err) {
      setPushMsg("❌ " + err.message);
    } finally {
      setPushLoading(false);
    }
  };

  // ── Telegram / Email toggle (just update DB preference) ────────────────────

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
      alert("Gagal menyimpan preferensi: " + error.message);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

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
          <h1 className="font-semibold">Profil Saya</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* ── Avatar preview ── */}
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

        {/* ── Edit Info ── */}
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

        {/* ── Notifikasi ── */}
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-sm">Notifikasi</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih cara kamu ingin diberitahu saat ada jadwal baru atau
              perubahan.
            </p>
          </div>

          <div className="px-5">
            {/* Push */}
            <div className="py-3.5 border-b">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    notif.notif_push
                      ? "bg-blue-100 text-blue-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {pushLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Push Notification</p>
                        {!pushSupport.supported && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                            Tidak didukung
                          </span>
                        )}
                        {pushSupport.supported &&
                          typeof Notification !== "undefined" &&
                          Notification.permission === "denied" && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                              Diblokir
                            </span>
                          )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {pushDescription}
                      </p>
                      {pushMsg && (
                        <p
                          className={`text-xs mt-1.5 font-medium ${
                            pushMsg.startsWith("✅")
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {pushMsg}
                        </p>
                      )}
                      {pushSupport.supported && !notif.notif_push && (
                        <p className="text-xs text-blue-500 mt-1">
                          Aktif di browser ini. Ulangi di tiap perangkat /
                          browser yang dipakai.
                        </p>
                      )}
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
                </div>
              </div>
            </div>

            {/* Telegram */}
            <div className="py-3.5 border-b">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    notif.notif_telegram
                      ? "bg-sky-100 text-sky-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Telegram</p>
                        {!form.telegram_chat_id && notif.notif_telegram && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            Chat ID belum diisi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {notif.notif_telegram
                          ? form.telegram_chat_id
                            ? `Aktif — Chat ID: ${form.telegram_chat_id}`
                            : "Isi Telegram Chat ID di bawah agar berfungsi."
                          : "Notifikasi via Telegram dimatikan."}
                      </p>
                    </div>
                    <Toggle
                      checked={notif.notif_telegram}
                      onChange={(v) => handleNotifToggle("notif_telegram", v)}
                    />
                  </div>

                  {/* Telegram Chat ID input — show when toggle is on */}
                  {notif.notif_telegram && (
                    <div className="mt-3 space-y-1.5">
                      <input
                        type="text"
                        value={form.telegram_chat_id}
                        onChange={(e) =>
                          setForm({ ...form, telegram_chat_id: e.target.value })
                        }
                        placeholder="Contoh: 123456789"
                        className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Dapatkan Chat ID via{" "}
                        <a
                          href="https://t.me/userinfobot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          @userinfobot
                        </a>{" "}
                        di Telegram, lalu klik <strong>Simpan Perubahan</strong>{" "}
                        di atas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="py-3.5">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    notif.notif_email
                      ? "bg-violet-100 text-violet-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {notif.notif_email
                          ? `Aktif — dikirim ke ${session?.user?.email}`
                          : "Notifikasi via email dimatikan."}
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

          {/* Info box */}
          <div className="mx-5 mb-5 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">📌 Info Notifikasi</p>
            <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
              <li>
                Notifikasi dikirim saat ada jadwal baru atau perubahan jadwal.
              </li>
              <li>
                Reminder harian dikirim setiap pagi jam{" "}
                <strong>08.00 WIB</strong>.
              </li>
              <li>
                Push Notification perlu diaktifkan di tiap browser/perangkat
                secara terpisah.
              </li>
              <li>
                iOS: tambahkan ke Home Screen dulu baru push aktif (Safari →
                Share → Add to Home Screen).
              </li>
            </ul>
          </div>
        </div>

        {/* ── Ganti Password ── */}
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
