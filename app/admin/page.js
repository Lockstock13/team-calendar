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

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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
      alert("Gagal: " + err.message);
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
    if (confirm(messages[action])) doAction(userId, action);
  };

  const activeMembers = members.filter((m) => m.is_active !== false);
  const inactiveMembers = members.filter((m) => m.is_active === false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

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
                {/* Toggle admin */}
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

                {/* Kick */}
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
              /* Activate */
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
            )}
          </div>
        )}
      </div>
    );
  }

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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold tabular-nums">
              {activeMembers.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Member Aktif</p>
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

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 space-y-1">
          <p className="font-semibold">📌 Catatan</p>
          <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>
              Member yang di-kick tidak bisa login, tapi akunnya masih
              tersimpan.
            </li>
            <li>Aktifkan kembali kapan saja dari daftar nonaktif di atas.</li>
            <li>
              Admin punya akses ke halaman ini dan bisa mengelola semua jadwal.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
