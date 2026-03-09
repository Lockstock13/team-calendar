"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGlobalContext } from "@/app/providers";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirm } from "@/app/components/ConfirmProvider";
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Crown,
  Trash2,
  Bell,
  Settings,
  Upload,
  Save,
  Loader2,
} from "lucide-react";
import Avatar from "@/app/components/Avatar";

function Badge({ children, color }) {
  const styles = {
    green:
      "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
    red: "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50",
    purple:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    gray: "bg-muted/50 text-muted-foreground border-border",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase border ${styles[color] || styles.gray}`}
    >
      {children}
    </span>
  );
}

// â”€â”€â”€ Delete Confirmation Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DeleteConfirmModal({ member, onConfirm, onCancel, loading, lang }) {
  const name =
    member?.full_name ||
    member?.email ||
    (lang === "id" ? "member ini" : "this member");

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-2xl border shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-base">
            {lang === "id"
              ? "Hapus Member Permanen?"
              : "Delete Member Permanently?"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {lang === "id" ? "Akun" : "Account"}{" "}
            <span className="font-semibold text-foreground">{name}</span>{" "}
            {lang === "id"
              ? "akan dihapus secara permanen. Data login mereka akan dihapus dan "
              : "will be permanently deleted. Their login data will be removed and "}
            <span className="font-semibold text-red-600">
              {lang === "id"
                ? "tidak dapat dipulihkan."
                : "cannot be recovered."}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "id"
              ? "Jadwal yang sudah di-assign ke member ini tidak terpengaruh."
              : "Tasks assigned to this member will not be affected."}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            {lang === "id" ? "Batal" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {loading
              ? lang === "id"
                ? "Menghapus..."
                : "Deleting..."
              : lang === "id"
                ? "Hapus Permanen"
                : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminPage() {
  const router = useRouter();
  const { language, appSettings, fetchSettings } = useGlobalContext();
  const lang = language || "en";
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // member object
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Customization state
  const [appNameInput, setAppNameInput] = useState(appSettings?.app_name || "");
  const [appColorInput, setAppColorInput] = useState(
    appSettings?.primary_color || "#0ea5e9",
  );
  const [dailyReminderEnabledInput, setDailyReminderEnabledInput] = useState(
    appSettings?.daily_reminder_enabled !== false,
  );
  const [dailyReminderTimeInput, setDailyReminderTimeInput] = useState(
    appSettings?.daily_reminder_time || "06:00",
  );
  const [dailyReminderTimezoneInput, setDailyReminderTimezoneInput] = useState(
    appSettings?.daily_reminder_timezone || "Asia/Jakarta",
  );
  const [enableChatInput, setEnableChatInput] = useState(
    appSettings?.enable_chat !== false,
  );
  const [enableNotesInput, setEnableNotesInput] = useState(
    appSettings?.enable_notes !== false,
  );
  const [enableReportInput, setEnableReportInput] = useState(
    appSettings?.enable_report !== false,
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (appSettings) {
      setAppNameInput(appSettings.app_name || "Team Calendar");
      setAppColorInput(appSettings.primary_color || "#0ea5e9");
      setDailyReminderEnabledInput(
        appSettings.daily_reminder_enabled !== false,
      );
      setDailyReminderTimeInput(appSettings.daily_reminder_time || "06:00");
      setDailyReminderTimezoneInput(
        appSettings.daily_reminder_timezone || "Asia/Jakarta",
      );
      setEnableChatInput(appSettings.enable_chat !== false);
      setEnableNotesInput(appSettings.enable_notes !== false);
      setEnableReportInput(appSettings.enable_report !== false);
    }
  }, [appSettings]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setCurrentUser(profile);
      await fetchMembers();
      setLoading(false);
    });
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, color, role, is_active, created_at")
      .order("created_at", { ascending: true });

    if (!error && data) setMembers(data);
  };

  // â”€â”€ Role / status actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const doAction = async (userId, action) => {
    setActionLoading(userId + action);
    try {
      let update = {};
      if (action === "kick") update = { is_active: false };
      if (action === "activate") update = { is_active: true };
      if (action === "make_admin") update = { role: "admin" };
      if (action === "make_member") update = { role: "member" };

      const { error } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", userId);

      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      addToast("Gagal: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAction = async (userId, action, name) => {
    const messages = {
      kick:
        lang === "id"
          ? `Nonaktifkan akun ${name}? Mereka tidak bisa login hingga diaktifkan kembali.`
          : `Deactivate ${name}'s account? They cannot log in until reactivated.`,
      activate:
        lang === "id"
          ? `Aktifkan kembali akun ${name}?`
          : `Reactivate ${name}'s account?`,
      make_admin:
        lang === "id"
          ? `Jadikan ${name} sebagai Admin?`
          : `Promote ${name} to Admin?`,
      make_member:
        lang === "id"
          ? `Turunkan ${name} ke Member biasa?`
          : `Demote ${name} to regular Member?`,
    };
    const ok = await confirm({
      title: lang === "id" ? "Konfirmasi Tindakan" : "Confirm Action",
      message: messages[action],
      confirmText: lang === "id" ? "Ya, Lanjutkan" : "Yes, Continue",
      cancelText: lang === "id" ? "Batal" : "Cancel",
    });
    if (ok) doAction(userId, action);
  };

  // â”€â”€ Permanent delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !currentUser) return;
    setDeleteLoading(true);

    // Optimistic: langsung hapus dari state
    const snapshot = members;
    setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          userId: deleteTarget.id,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal menghapus member");
      }

      // Konfirmasi dari server â€” re-fetch biar sinkron
      await fetchMembers();
    } catch (err) {
      // Revert optimistic update
      setMembers(snapshot);
      addToast("Gagal menghapus: " + err.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // â”€â”€ Derived lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const activeMembers = members.filter((m) => m.is_active !== false);
  const inactiveMembers = members.filter((m) => m.is_active === false);

  // â”€â”€ Test Push â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState("");

  const handleTestPush = async () => {
    setTestPushLoading(true);
    setTestPushMsg("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          mode: "test",
        }),
      });
      const result = await res.json();
      setTestPushMsg(`✅ Terkirim ke ${result.sent?.push ?? 0} perangkat`);
    } catch (err) {
      setTestPushMsg("❌ Gagal: " + err.message);
    } finally {
      setTestPushLoading(false);
      setTimeout(() => setTestPushMsg(""), 4000);
    }
  };

  // â”€â”€ Branding & Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveSettings = async () => {
    if (!appSettings?.id) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({
          app_name: appNameInput,
          primary_color: appColorInput,
          daily_reminder_enabled: dailyReminderEnabledInput,
          daily_reminder_time: dailyReminderTimeInput,
          daily_reminder_timezone: dailyReminderTimezoneInput,
          enable_chat: enableChatInput,
          enable_notes: enableNotesInput,
          enable_report: enableReportInput,
          updated_by: currentUser.id,
        })
        .eq("id", appSettings.id);
      if (error) throw error;
      await fetchSettings();
      addToast(
        lang === "id" ? "Pengaturan aplikasi disimpan!" : "App settings saved!",
        "success",
      );
    } catch (e) {
      addToast("Gagal menyimpan: " + e.message, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file || !appSettings?.id) return;

    if (!file.type.startsWith("image/")) {
      addToast(
        lang === "id"
          ? "Harap upload file gambar!"
          : "Please upload an image file!",
        "error",
      );
      return;
    }

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      addToast(
        lang === "id" ? "Ukuran file maks 2MB!" : "Max file size is 2MB!",
        "error",
      );
      return;
    }

    addToast(
      lang === "id" ? "Mengunggah logo..." : "Uploading logo...",
      "info",
    );

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        if (uploadError.statusCode === "404") {
          throw new Error(
            "Bucket 'assets' tidak ditemukan. Pastikan sudah menjalankan query SQL untuk Storage.",
          );
        }
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("app_settings")
        .update({ logo_url: publicUrl, updated_by: currentUser.id })
        .eq("id", appSettings.id);

      if (dbError) throw dbError;

      await fetchSettings();
      addToast(
        lang === "id"
          ? "Logo berhasil diupdate!"
          : "Logo updated successfully!",
        "success",
      );
    } catch (err) {
      addToast("Upload gagal: " + err.message, "error");
    }
  };

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // â”€â”€ Member row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function MemberRow({ member }) {
    const isMe = member.id === currentUser?.id;
    const busy = actionLoading?.startsWith(member.id);
    const isAdmin = member.role === "admin";
    const isActive = member.is_active !== false;

    return (
      <div className="flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 group">
        {/* Avatar with status indicator */}
        <div className="relative">
          <Avatar
            user={member}
            className="w-11 h-11 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
          />
          {!isActive && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-background rounded-full" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-bold tracking-tight truncate">
              {member.full_name ||
                (lang === "id" ? "(tanpa nama)" : "(no name)")}
            </span>
            {isAdmin && (
              <Crown className="w-3 h-3 text-amber-500 fill-amber-500/20" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              {member.email}
            </p>
            {isMe && (
              <Badge color="gray">{lang === "id" ? "Kamu" : "You"}</Badge>
            )}
            {isAdmin && (
              <Badge color="purple">{lang === "id" ? "Admin" : "Admin"}</Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isMe && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isActive ? (
              <>
                {/* Toggle admin role */}
                <button
                  onClick={() =>
                    confirmAction(
                      member.id,
                      isAdmin ? "make_member" : "make_admin",
                      member.full_name || member.email,
                    )
                  }
                  disabled={busy}
                  className={`p-2 rounded-xl transition-all active:scale-90 ${isAdmin
                      ? "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      : "text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    }`}
                  title={
                    isAdmin
                      ? lang === "id"
                        ? "Hapus Admin"
                        : "Remove Admin"
                      : lang === "id"
                        ? "Jadikan Admin"
                        : "Make Admin"
                  }
                >
                  {isAdmin ? (
                    <ShieldOff className="w-4.5 h-4.5" />
                  ) : (
                    <Shield className="w-4.5 h-4.5" />
                  )}
                </button>

                {/* Kick (nonaktifkan) */}
                <button
                  onClick={() =>
                    confirmAction(
                      member.id,
                      "kick",
                      member.full_name || member.email,
                    )
                  }
                  disabled={busy}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all active:scale-90"
                  title={lang === "id" ? "Nonaktifkan" : "Deactivate"}
                >
                  <UserX className="w-4.5 h-4.5" />
                </button>
              </>
            ) : (
              /* Inactive: Aktifkan + Hapus Permanen */
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    confirmAction(
                      member.id,
                      "activate",
                      member.full_name || member.email,
                    )
                  }
                  disabled={busy}
                  className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-all active:scale-90"
                  title={lang === "id" ? "Aktifkan kembali" : "Reactivate"}
                >
                  <UserCheck className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={() => setDeleteTarget(member)}
                  disabled={busy}
                  className="p-2 text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-all active:scale-90"
                  title={
                    lang === "id" ? "Hapus permanen" : "Delete permanently"
                  }
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-foreground">
                {lang === "id" ? "Panel Admin" : "Admin Panel"}
              </h1>
              <p className="text-xs font-medium text-muted-foreground">
                {lang === "id" ? "Manajemen Tim" : "Team Management"}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total",
              count: members.length,
              color: "bg-zinc-200 dark:bg-zinc-800",
            },
            {
              label: lang === "id" ? "Aktif" : "Active",
              count: activeMembers.length,
              color: "bg-emerald-500",
            },
            {
              label: lang === "id" ? "Pasif" : "Inactive",
              count: inactiveMembers.length,
              color: "bg-red-500",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-background border rounded-2xl p-4 shadow-sm relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 w-full h-1 ${stat.color} opacity-70`}
              />
              <p className="text-xl font-bold tabular-nums tracking-tight">
                {stat.count}
              </p>
              <p className="text-xs font-semibold text-muted-foreground tracking-wide mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* â”€â”€ App Customization â”€â”€ */}
        <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground/60" />
              <h2 className="text-sm font-semibold text-muted-foreground/85">
                {lang === "id" ? "Kontrol Aplikasi" : "App Control"}
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                    {lang === "id" ? "Nama Aplikasi" : "App Name"}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                    placeholder="e.g. My Awesome Studio"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                    {lang === "id" ? "Warna Utama" : "Primary Color"}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border shadow-sm group">
                      <input
                        type="color"
                        className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 scale-150"
                        value={appColorInput}
                        onChange={(e) => setAppColorInput(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <code className="text-xs font-mono font-bold tracking-tight bg-muted px-3 py-1.5 rounded-lg border border-border/50 uppercase">
                        {appColorInput}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                    {lang === "id" ? "Pengingat Harian" : "Daily Reminder"}
                  </label>
                  <div className="bg-muted/10 border border-border rounded-2xl p-4 space-y-3">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium">
                        {lang === "id"
                          ? "Aktifkan pengingat harian"
                          : "Enable daily reminder"}
                      </span>
                      <input
                        type="checkbox"
                        checked={dailyReminderEnabledInput}
                        onChange={(e) =>
                          setDailyReminderEnabledInput(e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {lang === "id" ? "Jam Kirim" : "Send Time"}
                        </span>
                        <input
                          type="time"
                          step="300"
                          value={dailyReminderTimeInput}
                          onChange={(e) =>
                            setDailyReminderTimeInput(e.target.value)
                          }
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {lang === "id" ? "Zona Waktu" : "Timezone"}
                        </span>
                        <select
                          value={dailyReminderTimezoneInput}
                          onChange={(e) =>
                            setDailyReminderTimezoneInput(e.target.value)
                          }
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Asia/Jakarta">
                            Asia/Jakarta (WIB)
                          </option>
                          <option value="Asia/Makassar">
                            Asia/Makassar (WITA)
                          </option>
                          <option value="Asia/Jayapura">
                            Asia/Jayapura (WIT)
                          </option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature Modules Toggles */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                    {lang === "id" ? "Modul Fitur" : "Feature Modules"}
                  </label>
                  <div className="bg-muted/10 border border-border rounded-2xl p-4 space-y-3">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium">
                        {lang === "id"
                          ? "Aktifkan Obrolan Tim"
                          : "Enable Team Chat"}
                      </span>
                      <input
                        type="checkbox"
                        checked={enableChatInput}
                        onChange={(e) => setEnableChatInput(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                      <span className="text-xs font-medium">
                        {lang === "id" ? "Aktifkan Catatan" : "Enable Notes"}
                      </span>
                      <input
                        type="checkbox"
                        checked={enableNotesInput}
                        onChange={(e) => setEnableNotesInput(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                      <span className="text-xs font-medium">
                        {lang === "id"
                          ? "Aktifkan Laporan Bulanan"
                          : "Enable Monthly Report"}
                      </span>
                      <input
                        type="checkbox"
                        checked={enableReportInput}
                        onChange={(e) => setEnableReportInput(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground/70 ml-1">
                  {lang === "id"
                    ? "Identity Branding (Logo)"
                    : "Branding Identity"}
                </label>
                <div className="flex items-center gap-5 p-4 bg-muted/5 rounded-[1.5rem] border border-dashed border-border">
                  <div className="w-20 h-20 bg-background border rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                    {appSettings?.logo_url ? (
                      <img
                        src={appSettings.logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Shield className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95 flex items-center gap-2 shadow-md">
                      <Upload className="w-3.5 h-3.5" />
                      {lang === "id" ? "PILIH LOGO" : "CHOOSE LOGO"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadLogo}
                      />
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-tight max-w-[120px] font-medium">
                      {lang === "id"
                        ? "Rekomendasi 1:1, Max 2MB."
                        : "Recommended 1:1 ratio, Max 2MB."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !appSettings}
                className="w-full sm:w-auto bg-primary text-primary-foreground text-sm font-semibold px-8 py-3.5 rounded-2xl hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingSettings
                  ? lang === "id"
                    ? "MENYIMPAN..."
                    : "SAVING..."
                  : lang === "id"
                    ? "SIMPAN PERUBAHAN"
                    : "SAVE SETTINGS"}
              </button>
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground/85">
              {lang === "id" ? "Member Aktif" : "Active Members"}
            </h2>
            <Badge color="green">
              {activeMembers.length} {lang === "id" ? "orang" : "users"}
            </Badge>
          </div>
          <div className="px-6">
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center font-medium">
                {lang === "id" ? "Belum ada member" : "No members found"}
              </p>
            ) : (
              activeMembers.map((m) => <MemberRow key={m.id} member={m} />)
            )}
          </div>
        </div>

        {/* Inactive Members */}
        {inactiveMembers.length > 0 && (
          <div className="bg-background border rounded-[2rem] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b bg-muted/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground/85">
                {lang === "id" ? "Akun Pasif" : "Inactive Accounts"}
              </h2>
              <Badge color="red">
                {inactiveMembers.length} {lang === "id" ? "orang" : "users"}
              </Badge>
            </div>
            <div className="px-6">
              {inactiveMembers.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {/* Test Push */}
        <div className="bg-background border rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold tracking-tight">
                {lang === "id"
                  ? "🔔 Tes Push Notification"
                  : "🔔 Test Push Notification"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {lang === "id"
                ? "Kirim notifikasi uji coba ke semua member aktif."
                : "Send a test notification to all active members."}
            </p>
            {testPushMsg && (
              <p className="text-xs mt-1 font-semibold text-emerald-600">
                {testPushMsg}
              </p>
            )}
          </div>
          <button
            onClick={handleTestPush}
            disabled={testPushLoading}
            className="flex items-center justify-center gap-3 px-6 py-3.5 bg-muted hover:bg-muted/80 text-foreground rounded-2xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 shadow-sm border"
          >
            <Bell className="w-4 h-4" />
            {testPushLoading
              ? lang === "id"
                ? "Mengirim..."
                : "Sending..."
              : lang === "id"
                ? "Tes Push"
                : "Test Push"}
          </button>
        </div>

        {/* Info box */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-3 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
            <p className="text-xs font-semibold text-muted-foreground">
              {lang === "id" ? "Prosedur Manajemen" : "Management Rules"}
            </p>
          </div>
          <ul className="space-y-3">
            {[
              {
                title: lang === "id" ? "KICK" : "KICK",
                text:
                  lang === "id"
                    ? "Menonaktifkan akun sementara. Data preservasi tetap ada namun hak akses dicabut."
                    : "Deactivates account. Access is revoked but history is preserved.",
              },
              {
                title: lang === "id" ? "DELETE" : "DELETE",
                text:
                  lang === "id"
                    ? "Hanya tersedia untuk akun pasif. Menghapus identitas permanen dari database."
                    : "Permanent identity removal from database (only for inactive users).",
              },
              {
                title: lang === "id" ? "ROLES" : "ROLES",
                text:
                  lang === "id"
                    ? "Admin memiliki kontrol penuh atas jadwal dan manajemen tim."
                    : "Admins have full control over schedules and team settings.",
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-[11px] font-semibold text-white bg-zinc-400 dark:bg-zinc-600 px-1.5 py-0.5 rounded h-fit mt-0.5 w-10 text-center">
                  {item.title}
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
