"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AuthForm from "@/app/components/AuthForm";
import Header from "@/app/components/Header";
import MobileNav from "@/app/components/MobileNav";
import TaskForm from "@/app/components/TaskForm";
import { usePathname } from "next/navigation";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirm } from "@/app/components/ConfirmProvider";
import { ThemeProvider } from "next-themes";

const GlobalContext = createContext({});

export const useGlobalContext = () => useContext(GlobalContext);

// Helper for color generation
const generateColor = (str) => {
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
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
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function Providers({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inactiveBlock, setInactiveBlock] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [unreadChat, setUnreadChat] = useState(0);
  const pathname = usePathname();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [language, setLanguageState] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem("app_lang");
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await bootSession(session);
      else setLoading(false);
    });

    const chatChannel = supabase
      .channel("chat_unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          if (!pathname?.includes("/chat")) setUnreadChat((n) => n + 1);
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
      }
    });

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
  }, [pathname]);

  const bootSession = async (session) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile && profile.is_active === false) {
      setInactiveBlock(true);
      setLoading(false);
      return;
    }

    setSession(session);
    setUserProfile(profile);
    await Promise.all([fetchTasks(), fetchUsers()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, color, role")
      .neq("is_active", false);

    if (!error && data) {
      setUsers(
        data.map((u) => ({ ...u, color: u.color || generateColor(u.id) })),
      );
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("start_date", { ascending: true });

    if (!error) setTasks(data || []);
  };

  const handleTaskSubmit = async (formData) => {
    if (!session) {
      addToast("Sesi habis, silakan refresh halaman.", "error");
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

      setShowForm(false);
      setEditingTask(null);
      addToast(
        editingTask
          ? "Jadwal berhasil diupdate ✓"
          : "Jadwal berhasil ditambahkan ✓",
        "success",
      );

      fetchTasks().catch(() => { });

      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: taskData,
          assigneeIds,
          actorName: userProfile?.full_name || session.user.email,
          action: editingTask ? "updated" : "created",
        }),
      }).catch(() => { });
    } catch (err) {
      addToast("Gagal menyimpan: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    const ok = await confirm({
      title: "Hapus Jadwal",
      message:
        "Apakah kamu yakin ingin menghapus jadwal ini? Tindakan ini tidak bisa dibatalkan.",
      confirmText: "Hapus",
      cancelText: "Batal",
    });
    if (!ok) return;

    await supabase.from("tasks").delete().eq("id", taskId);
    addToast("Jadwal sudah dihapus.", "info");
    fetchTasks();
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
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

        if (signUpData.user && !signUpData.session) {
          setAuthError(
            "✅ Akun berhasil dibuat! Cek email untuk konfirmasi, lalu login.",
          );
          setAuthLoading(false);
          return;
        }
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => supabase.auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-6 w-full opacity-50">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="h-14 bg-zinc-200 rounded-2xl w-full"></div>

          {/* Toolbar Skeleton */}
          <div className="flex justify-between items-center mt-6">
            <div className="space-y-2">
              <div className="h-6 bg-zinc-200 rounded w-40"></div>
              <div className="h-3 bg-zinc-200 rounded w-32"></div>
            </div>
            <div className="h-10 w-28 bg-zinc-200 rounded-xl"></div>
          </div>

          {/* Content Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 h-[450px] bg-zinc-200 rounded-2xl"></div>
            <div className="h-[450px] bg-zinc-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

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

  if (!session) {
    return (
      <AuthForm onAuth={handleAuth} loading={authLoading} error={authError} lang={language || "en"} />
    );
  }

  // Clear unread chat badge when entering chat
  if (pathname === "/chat" && unreadChat > 0) {
    setUnreadChat(0);
  }

  return (
    <GlobalContext.Provider
      value={{
        session,
        userProfile,
        tasks,
        users,
        setTasks,
        fetchTasks,
        showForm,
        setShowForm,
        editingTask,
        setEditingTask,
        handleEditTask,
        handleDeleteTask,
        handleUpdateTaskStatus,
        handleTaskSubmit,
        language,
        setLanguage,
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-muted/20">
          <Header
            session={session}
            userProfile={userProfile}
            handleLogout={handleLogout}
            unreadChat={unreadChat}
          />
          {children}
          <MobileNav unreadChat={unreadChat} />

          {showForm && (
            <TaskForm /* We need to import TaskForm in providers.js */
              users={users}
              editingTask={editingTask}
              onSubmit={handleTaskSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
              submitting={submitting}
            />
          )}
        </div>
      </ThemeProvider>
    </GlobalContext.Provider>
  );
}
