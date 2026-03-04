"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Plus } from "lucide-react";

import Header from "./components/Header";
import AuthForm from "./components/AuthForm";
import DashboardView from "./components/DashboardView";
import ListView from "./components/ListView";
import dynamic from "next/dynamic";

const CalendarView = dynamic(() => import("./components/CalendarView"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground bg-background rounded-2xl border animate-pulse">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium">Memuat Kalender...</p>
    </div>
  ),
});
import TaskForm from "./components/TaskForm";
import NotesView from "./components/NotesView";
import ReportView from "./components/ReportView";
import ChatView from "./components/ChatView";
import BottomNav from "./components/BottomNav";
import ConfirmDialog from "./components/ConfirmDialog";
import AppToast from "./components/AppToast";
import { useDarkMode } from "./hooks/useDarkMode";

const VALID_VIEW_MODES = [
  "dashboard",
  "calendar",
  "list",
  "notes",
  "report",
  "chat",
];

const normalizeViewMode = (value) =>
  VALID_VIEW_MODES.includes(value) ? value : "dashboard";
const BOOT_FETCH_TIMEOUT_MS = 12000;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms),
    ),
  ]);

// Generate warna fallback yang lebih elegan untuk Avatar
const generateColor = (str) => {
  const colors = [
    "#f43f5e", // Rose
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#14b8a6", // Teal
    "#0ea5e9", // Sky
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#d946ef", // Fuchsia
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Home() {
  const [isDark, toggleDark] = useDarkMode();
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [inactiveBlock, setInactiveBlock] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type }
  const [submitting, setSubmitting] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [autoShowNoteForm, setAutoShowNoteForm] = useState(false);
  const [dialog, setDialog] = useState(null); // { type, title, message, onConfirm? }

  // ─── Ref to always read latest viewMode inside realtime callbacks ──────────
  // Without this, closures in useEffect capture the *initial* value of viewMode
  // and the unread chat badge logic would never update correctly.
  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const applyViewMode = useCallback(
    (nextMode, { syncUrl = true, persist = true } = {}) => {
      const mode = normalizeViewMode(nextMode);

      if (mode === "chat") setUnreadChat(0);
      setViewMode(mode);

      if (typeof window === "undefined") return;

      if (persist) {
        try {
          localStorage.setItem("lastViewMode", mode);
        } catch { }
      }

      if (syncUrl) {
        const url = new URL(window.location.href);
        if (mode === "dashboard") url.searchParams.delete("view");
        else url.searchParams.set("view", mode);
        window.history.replaceState(
          {},
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    },
    [],
  );

  // Hydrate initial view mode from URL or local storage, and keep Back/Forward in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("view");
      const fromStorage = localStorage.getItem("lastViewMode");
      const mode =
        normalizeViewMode(fromUrl) !== "dashboard"
          ? normalizeViewMode(fromUrl)
          : normalizeViewMode(fromStorage);

      applyViewMode(mode, { syncUrl: true, persist: true });
    };

    initFromLocation();

    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("view");
      applyViewMode(normalizeViewMode(fromUrl), {
        syncUrl: false,
        persist: true,
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyViewMode]);

  // ─── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) await bootSession(session);
        else setLoading(false);
      } catch (err) {
        console.error("[auth] getSession error:", err);
        setLoading(false);
      }
    };

    initSession();

    // Realtime: unread chat badge
    // Uses viewModeRef (not viewMode directly) to avoid stale closure bug.
    const chatChannel = supabase
      .channel("chat_unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          if (viewModeRef.current !== "chat") setUnreadChat((n) => n + 1);
        },
      )
      .subscribe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) await bootSession(session);
      else {
        setSession(null);
        setUserProfile(null);
        setTasks([]);
        setUsers([]);
        setInactiveBlock(false);
        setLoading(false);
      }
    });

    // Realtime: auto-refresh tasks ketika siapapun add/edit/delete
    const channel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchTasks(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchUsers(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      supabase.removeChannel(chatChannel);
    };
  }, []);

  const bootSession = async (session) => {
    try {
      const { data: profile } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        BOOT_FETCH_TIMEOUT_MS,
        "profile",
      );

      // Blokir user non-aktif
      if (profile && profile.is_active === false) {
        setInactiveBlock(true);
        return;
      }

      setSession(session);
      setUserProfile(profile || null);

      await Promise.allSettled([
        withTimeout(fetchTasks(), BOOT_FETCH_TIMEOUT_MS, "tasks"),
        withTimeout(fetchUsers(), BOOT_FETCH_TIMEOUT_MS, "users"),
      ]);
    } catch (err) {
      console.error("[auth] bootSession error:", err);
      setSession(session);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (mode, data) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { full_name: data.full_name } },
        });
        if (error) throw error;

        // Kalau perlu konfirmasi email dulu
        if (signUpData.user && !signUpData.session) {
          setAuthError(
            "✅ Akun berhasil dibuat! Cek email untuk konfirmasi, lalu login.",
          );
          setAuthLoading(false);
          return;
        }

        // Kalau langsung masuk (email confirmation dimatikan)
        if (signUpData.user) {
          await supabase.from("profiles").upsert(
            {
              id: signUpData.user.id,
              email: data.email,
              full_name: data.full_name,
              role: "member",
              is_active: true,
            },
            { onConflict: "id" },
          );
        }
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ─── Data ─────────────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, color, role")
        .neq("is_active", false);

      if (!error && data) {
        setUsers(
          data.map((u) => ({
            ...u,
            color: u.color || generateColor(u.id),
          })),
        );
      }
    } catch (err) {
      console.error("[data] fetchUsers error:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }
      setTasks(data || []);
    } catch (err) {
      console.error("[data] fetchTasks error:", err);
    }
  };

  // ─── Task CRUD ────────────────────────────────────────────────────────────────

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (formData) => {
    if (!session) {
      showToast("Sesi habis, silakan refresh halaman.", "error");
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    const assigneeIds = formData.assignee_ids;
    const assigneeUsers = users.filter((u) => assigneeIds.includes(u.id));
    const assigneeNames = assigneeUsers
      .map((u) => u.full_name || u.email)
      .join(", ");

    const taskData = {
      title: formData.title,
      description: formData.description,
      start_date: formData.start_date,
      end_date: formData.end_date,
      priority: formData.priority || "medium",
      created_by: session.user.id,
      assignee_ids: assigneeIds,
      assigned_to_name: assigneeNames,
      status: editingTask?.status || "todo",
      is_weekend_task: false,
      is_comday: formData.task_type === "libur_pengganti",
      task_type: formData.task_type,
    };

    try {
      let error;
      if (editingTask) {
        ({ error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id));
      } else {
        ({ error } = await supabase.from("tasks").insert([taskData]));
      }
      if (error) throw error;

      closeForm();
      showToast(
        editingTask
          ? "Jadwal berhasil diupdate ✓"
          : "Jadwal berhasil ditambahkan ✓",
      );

      // Kirim notif (fire & forget)
      fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          task: taskData,
          assigneeIds,
          action: editingTask ? "updated" : "created",
        }),
      }).catch(() => { });
    } catch (err) {
      console.error("❌ handleSubmit error:", err);
      showToast("Gagal menyimpan: " + (err?.message || JSON.stringify(err)), "error");
    } finally {
      // SELALU reset submitting, baik sukses maupun gagal
      setSubmitting(false);
    }
  };

  const handleEdit = useCallback((task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((taskId) => {
    setDialog({
      type: "confirm",
      title: "Hapus jadwal ini?",
      message: "Tindakan ini tidak dapat dibatalkan.",
      onConfirm: async () => {
        const snapshot = tasks;
        setTasks((prev) => prev.filter((t) => t.id !== taskId));

        const { error } = await supabase.from("tasks").delete().eq("id", taskId);
        if (error) {
          setTasks(snapshot);
          showToast(`Gagal menghapus jadwal: ${error.message}`, "error");
          return;
        }
        showToast("Jadwal berhasil dihapus ✓");
      },
    });
  }, [tasks]);

  const handleUpdateStatus = useCallback(async (taskId, newStatus) => {
    const previousStatus = tasks.find((t) => t.id === taskId)?.status;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: previousStatus || "todo" } : t,
        ),
      );
      showToast(`Gagal update status: ${error.message}`, "error");
    }
  }, [tasks]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingTask(null);
  }, []);

  const openNewForm = useCallback(() => {
    setEditingTask(null);
    setShowForm(true);
  }, []);

  // Keyboard workflow (desktop): N = new task, 1..6 = switch view.
  useEffect(() => {
    if (!session) return;

    const isEditableTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable
      );
    };

    const onKeyDown = (e) => {
      if (e.defaultPrevented || isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        openNewForm();
        return;
      }

      const map = {
        "1": "dashboard",
        "2": "calendar",
        "3": "list",
        "4": "notes",
        "5": "report",
        "6": "chat",
      };

      const next = map[key];
      if (next) {
        e.preventDefault();
        applyViewMode(next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session, openNewForm, applyViewMode]);

  // Stable setViewMode wrapper — avoids creating new arrow on every render
  // NOTE: All hooks MUST be above early returns (React Rules of Hooks)
  const setViewModeWithReset = useCallback((v) => {
    applyViewMode(v);
  }, [applyViewMode]);

  // Today's date string
  const todayLabel = useMemo(
    () => format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewMode],
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // Akun dinonaktifkan
  if (inactiveBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm bg-background border rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="font-bold text-lg">Akun Dinonaktifkan</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akun kamu telah dinonaktifkan oleh admin. Hubungi admin untuk
            mengaktifkan kembali.
          </p>
          <button
            onClick={() => {
              supabase.auth.signOut();
              setInactiveBlock(false);
            }}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // Belum login
  if (!session) {
    return (
      <AuthForm onAuth={handleAuth} loading={authLoading} error={authError} />
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Header
        session={session}
        userProfile={userProfile}
        viewMode={viewMode}
        setViewMode={setViewModeWithReset}
        handleLogout={handleLogout}
        unreadChat={unreadChat}
        isDark={isDark}
        toggleDark={toggleDark}
      />

      {/* pb-24 on mobile clears the bottom nav */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">
              {viewMode === "dashboard" && "Dashboard"}
              {viewMode === "calendar" && "Kalender Jadwal"}
              {viewMode === "list" && "Semua Jadwal"}
              {viewMode === "notes" && "Catatan"}
              {viewMode === "report" && "Laporan Bulanan"}
              {viewMode === "chat" && "Team Chat"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {todayLabel}
            </p>
            <p className="hidden md:block text-[11px] text-muted-foreground/80 mt-1">
              Shortcut: <kbd className="px-1 py-0.5 border rounded">N</kbd>{" "}
              tambah jadwal, <kbd className="px-1 py-0.5 border rounded">1-6</kbd>{" "}
              pindah menu
            </p>
          </div>

          {/* Desktop only — on mobile the center FAB handles this */}
          <button
            onClick={openNewForm}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal
          </button>
        </div>

        {/* Views */}
        <section key={viewMode} className="animate-view-in">
          {viewMode === "dashboard" && (
            <DashboardView
              tasks={tasks}
              users={users}
              currentUserId={session.user.id}
            />
          )}

          {viewMode === "calendar" && (
            <CalendarView
              tasks={tasks}
              users={users}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {viewMode === "list" && (
            <ListView
              tasks={tasks}
              users={users}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdateStatus={handleUpdateStatus}
              filterUserId={filterUserId}
            />
          )}

          {viewMode === "notes" && (
            <NotesView
              session={session}
              userProfile={userProfile}
              autoShowForm={autoShowNoteForm}
              onAutoShowFormHandled={() => setAutoShowNoteForm(false)}
            />
          )}

          {viewMode === "report" && <ReportView tasks={tasks} users={users} />}

          {viewMode === "chat" && (
            <ChatView session={session} userProfile={userProfile} users={users} />
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        viewMode={viewMode}
        setViewMode={setViewModeWithReset}
        unreadChat={unreadChat}
        isAdmin={userProfile?.role === "admin"}
        onAddTask={openNewForm}
        onAddNote={() => {
          setAutoShowNoteForm(true);
          setViewModeWithReset("notes");
        }}
        isDark={isDark}
        toggleDark={toggleDark}
      />

      <AppToast toast={toast} />

      {showForm && (
        <TaskForm
          users={users}
          editingTask={editingTask}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitting={submitting}
        />
      )}

      {dialog && (
        <ConfirmDialog
          {...dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

