"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Crown,
  Trash2,
  Bell,
} from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import AppToast from "@/app/components/AppToast";

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

function DeleteConfirmModal({ member, onConfirm, onCancel, loading }) {
  const name = member?.full_name || member?.email || "member ini";

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
          <h3 className="font-bold text-base">Hapus Member Permanen?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun <span className="font-semibold text-foreground">{name}</span>{" "}
            akan dihapus secara permanen. Data login mereka akan dihapus dan{" "}
            <span className="font-semibold text-red-600">
              tidak dapat dipulihkan.
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Jadwal yang sudah di-assign ke member ini tidak terpengaruh.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            Batal
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
            {loading ? "Menghapus..." : "Hapus Permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // member object
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/");
        return;
      }
      setAccessToken(session.access_token || "");

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
      showToast("Gagal: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAction = (userId, action, name) => {
    const messages = {
      kick: `Nonaktifkan akun ${name}? Mereka tidak bisa login hingga diaktifkan kembali.`,
      activate: `Aktifkan kembali akun ${name}?`,
      make_admin: `Jadikan ${name} sebagai Admin?`,
      make_member: `Turunkan ${name} ke Member biasa?`,
    };
    setDialog({
      type: "confirm",
      title: "Konfirmasi Perubahan",
      message: messages[action],
      danger: action === "kick",
      confirmLabel: "Lanjutkan",
      cancelLabel: "Batal",
      onConfirm: () => doAction(userId, action),
    });
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: deleteTarget.id,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal menghapus member");
      }

      // Konfirmasi dari server — re-fetch biar sinkron
      await fetchMembers();
      showToast(result.message || "Member berhasil dihapus");
    } catch (err) {
      // Revert optimistic update
      setMembers(snapshot);
      showToast("Gagal menghapus: " + err.message, "error");
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
          action: "created",
        }),
      });
      const result = await res.json();
      setTestPushMsg(`✅ Terkirim ke ${result.sent?.push ?? 0} perangkat`);
    } catch (err) {
      setTestPushMsg("❌ Gagal: " + err.message);
      showToast("Test push gagal: " + err.message, "error");
    } finally {
      setTestPushLoading(false);
      setTimeout(() => setTestPushMsg(""), 4000);
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
              {member.full_name || "(no name)"}
            </span>
            {isAdmin && <Badge color="purple">👑 Admin</Badge>}
            {!isActive && <Badge color="red">Nonaktif</Badge>}
            {isMe && <Badge color="gray">Kamu</Badge>}
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
                  title="Nonaktifkan"
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
            <h1 className="font-semibold">Manajemen Member</h1>
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
            <p className="text-xs text-muted-foreground mt-1">Aktif</p>
          </div>
          <div className="bg-background border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-red-500">
              {inactiveMembers.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Nonaktif</p>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Member Aktif</h2>
            <Badge color="green">{activeMembers.length} orang</Badge>
          </div>
          <div className="px-5">
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Belum ada member
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
              <h2 className="font-semibold text-sm">Akun Nonaktif</h2>
              <Badge color="red">{inactiveMembers.length} orang</Badge>
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
              Kirim test push ke semua member yang sudah aktifkan notifikasi.
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
            {testPushLoading ? "Mengirim..." : "Test Push"}
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

      {dialog && (
        <ConfirmDialog
          {...dialog}
          onClose={() => setDialog(null)}
        />
      )}

      <AppToast toast={toast} />
    </div>
  );
}
