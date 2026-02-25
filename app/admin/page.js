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
} from "lucide-react";

function Avatar({ user }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: user?.color || "#64748b" }}
    >
      {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function Badge({ children, color }) {
  const styles = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-700",
    gray: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[color] || styles.gray}`}
    >
      {children}
    </span>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteConfirmModal({ member, onConfirm, onCancel, loading, lang }) {
  const name = member?.full_name || member?.email || (lang === "id" ? "member ini" : "this member");

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
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-base">{lang === "id" ? "Hapus Member Permanen?" : "Delete Member Permanently?"}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {lang === "id" ? "Akun" : "Account"} <span className="font-semibold text-foreground">{name}</span>{" "}
            {lang === "id" ? "akan dihapus secara permanen. Data login mereka akan dihapus dan " : "will be permanently deleted. Their login data will be removed and "}
            <span className="font-semibold text-red-600">
              {lang === "id" ? "tidak dapat dipulihkan." : "cannot be recovered."}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "id" ? "Jadwal yang sudah di-assign ke member ini tidak terpengaruh." : "Tasks assigned to this member will not be affected."}
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
            {loading ? (lang === "id" ? "Menghapus..." : "Deleting...") : (lang === "id" ? "Hapus Permanen" : "Delete Permanently")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [appColorInput, setAppColorInput] = useState(appSettings?.primary_color || "#0ea5e9");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (appSettings) {
      setAppNameInput(appSettings.app_name || "Team Calendar");
      setAppColorInput(appSettings.primary_color || "#0ea5e9");
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

  // ── Role / status actions ──────────────────────────────────────────────────

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
      kick: `Nonaktifkan akun ${name}? Mereka tidak bisa login hingga diaktifkan kembali.`,
      activate: `Aktifkan kembali akun ${name}?`,
      make_admin: `Jadikan ${name} sebagai Admin?`,
      make_member: `Turunkan ${name} ke Member biasa?`,
    };
    const ok = await confirm({
      title: "Konfirmasi Tindakan",
      message: messages[action],
      confirmText: "Ya, Lanjutkan",
      cancelText: "Batal"
    });
    if (ok) doAction(userId, action);
  };

  // ── Permanent delete ───────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !currentUser) return;
    setDeleteLoading(true);

    // Optimistic: langsung hapus dari state
    const snapshot = members;
    setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);

    try {
      const res = await fetch("/api/admin/delete-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deleteTarget.id,
          requesterId: currentUser.id,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal menghapus member");
      }

      // Konfirmasi dari server — re-fetch biar sinkron
      await fetchMembers();
    } catch (err) {
      // Revert optimistic update
      setMembers(snapshot);
      addToast("Gagal menghapus: " + err.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

  const activeMembers = members.filter((m) => m.is_active !== false);
  const inactiveMembers = members.filter((m) => m.is_active === false);

  // ── Test Push ──────────────────────────────────────────────────────────────
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState("");

  const handleTestPush = async () => {
    setTestPushLoading(true);
    setTestPushMsg("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            title: "Test Push Notification",
            description: "Ini adalah test push dari admin.",
            start_date: new Date().toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
            task_type: "regular",
            assigned_to_name: "Semua Member",
          },
          assigneeIds: members.map((m) => m.id),
          actorName: currentUser?.full_name || "Admin",
          action: "created",
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

  // ── Branding & Settings ────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!appSettings?.id) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ app_name: appNameInput, primary_color: appColorInput, updated_by: currentUser.id })
        .eq('id', appSettings.id);
      if (error) throw error;
      await fetchSettings();
      addToast(lang === "id" ? "Pengaturan aplikasi disimpan!" : "App settings saved!", "success");
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
      addToast(lang === "id" ? "Harap upload file gambar!" : "Please upload an image file!", "error");
      return;
    }

    addToast(lang === "id" ? "Mengunggah logo..." : "Uploading logo...", "info");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        if (uploadError.statusCode === "404") {
          throw new Error("Bucket 'assets' tidak ditemukan. Pastikan sudah menjalankan query SQL untuk Storage.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('app_settings')
        .update({ logo_url: publicUrl, updated_by: currentUser.id })
        .eq('id', appSettings.id);

      if (dbError) throw dbError;

      await fetchSettings();
      addToast(lang === "id" ? "Logo berhasil diupdate!" : "Logo updated successfully!", "success");
    } catch (err) {
      addToast("Upload gagal: " + err.message, "error");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Member row ─────────────────────────────────────────────────────────────

  function MemberRow({ member }) {
    const isMe = member.id === currentUser?.id;
    const busy = actionLoading?.startsWith(member.id);
    const isAdmin = member.role === "admin";
    const isActive = member.is_active !== false;

    return (
      <div className="flex items-center gap-3 py-3.5 border-b last:border-0">
        {/* Avatar */}
        <Avatar user={member} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {member.full_name || (lang === "id" ? "(tanpa nama)" : "(no name)")}
            </span>
            {isAdmin && <Badge color="purple">👑 Admin</Badge>}
            {!isActive && <Badge color="red">{lang === "id" ? "Nonaktif" : "Inactive"}</Badge>}
            {isMe && <Badge color="gray">{lang === "id" ? "Kamu" : "You"}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {member.email}
          </p>
        </div>

        {/* Actions */}
        {!isMe && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive ? (
              <>
                {/* Toggle admin role */}
                {isAdmin ? (
                  <button
                    onClick={() =>
                      confirmAction(
                        member.id,
                        "make_member",
                        member.full_name || member.email,
                      )
                    }
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-40"
                    title="Turunkan jadi Member"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus Admin</span>
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      confirmAction(
                        member.id,
                        "make_admin",
                        member.full_name || member.email,
                      )
                    }
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-40"
                    title="Jadikan Admin"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Jadikan Admin</span>
                  </button>
                )}

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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  title={lang === "id" ? "Nonaktifkan" : "Deactivate"}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kick</span>
                </button>
              </>
            ) : (
              /* Inactive: Aktifkan + Hapus Permanen */
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    confirmAction(
                      member.id,
                      "activate",
                      member.full_name || member.email,
                    )
                  }
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Aktifkan kembali"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Aktifkan</span>
                </button>

                {/* Hapus Permanen */}
                <button
                  onClick={() => setDeleteTarget(member)}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Hapus permanen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h1 className="font-bold uppercase tracking-wide">{lang === "id" ? "Manajemen Member" : "Member Management"}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold tabular-nums">{members.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </div>
          <div className="bg-background border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-600">
              {activeMembers.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{lang === "id" ? "Aktif" : "Active"}</p>
          </div>
          <div className="bg-background border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-red-500">
              {inactiveMembers.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{lang === "id" ? "Nonaktif" : "Inactive"}</p>
          </div>
        </div>

        {/* ── App Customization ── */}
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              {lang === "id" ? "Kustomisasi Aplikasi" : "App Customization"}
            </h2>
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    {lang === "id" ? "Nama Aplikasi / Tim" : "App / Team Name"}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-muted/50 border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                    placeholder="e.g. My Awesome Studio"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    {lang === "id" ? "Warna Utama" : "Primary Color"}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                      value={appColorInput}
                      onChange={(e) => setAppColorInput(e.target.value)}
                    />
                    <span className="text-sm font-mono text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded">
                      {appColorInput}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    {lang === "id" ? "Logo Aplikasi" : "App Logo"}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-muted/50 border-2 border-dashed rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {appSettings?.logo_url ? (
                        <img src={appSettings.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Shield className="w-6 h-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        {lang === "id" ? "Pilih Gambar..." : "Choose Image..."}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} />
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-2 max-w-[150px]">
                        {lang === "id" ? "Gunakan gambar 1:1, max 2MB." : "Use 1:1 image ratio, max 2MB."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !appSettings}
                className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? (lang === "id" ? "Menyimpan..." : "Saving...") : (lang === "id" ? "Simpan Perubahan" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">{lang === "id" ? "Member Aktif" : "Active Members"}</h2>
            <Badge color="green">{activeMembers.length} {lang === "id" ? "orang" : "users"}</Badge>
          </div>
          <div className="px-5">
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {lang === "id" ? "Belum ada member" : "No members found"}
              </p>
            ) : (
              activeMembers.map((m) => <MemberRow key={m.id} member={m} />)
            )}
          </div>
        </div>

        {/* Inactive Members */}
        {inactiveMembers.length > 0 && (
          <div className="bg-background border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">{lang === "id" ? "Akun Nonaktif" : "Inactive Accounts"}</h2>
              <Badge color="red">{inactiveMembers.length} {lang === "id" ? "orang" : "users"}</Badge>
            </div>
            <div className="px-5">
              {inactiveMembers.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {/* Test Push */}
        <div className="bg-background border rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">🔔 Test Push Notification</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "id" ? "Kirim test push ke semua member yang sudah aktifkan notifikasi." : "Send a test push notification to all members with active alerts."}
            </p>
            {testPushMsg && (
              <p className="text-xs mt-1 font-medium text-emerald-600">
                {testPushMsg}
              </p>
            )}
          </div>
          <button
            onClick={handleTestPush}
            disabled={testPushLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
          >
            <Bell className="w-4 h-4" />
            {testPushLoading ? (lang === "id" ? "Mengirim..." : "Sending...") : "Test Push"}
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 space-y-1">
          <p className="font-semibold">📌 Catatan</p>
          <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>
              Member yang di-<strong>Kick</strong> tidak bisa login, tapi
              akunnya masih tersimpan dan bisa diaktifkan kembali.
            </li>
            <li>
              Tombol <strong>Hapus</strong> muncul di akun nonaktif — menghapus
              data login secara permanen dan tidak bisa dibatalkan.
            </li>
            <li>
              Admin punya akses ke halaman ini dan bisa mengelola semua jadwal.
            </li>
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
