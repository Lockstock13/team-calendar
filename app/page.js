"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Plus } from "lucide-react";

import Header from "./components/Header";
import AuthForm from "./components/AuthForm";
import DashboardView from "./components/DashboardView";
import CalendarView from "./components/CalendarView";
import ListView from "./components/ListView";
import TaskForm from "./components/TaskForm";

// Generate warna fallback berdasarkan string
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
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Home() {
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

  // ─── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await bootSession(session);
      else setLoading(false);
    });

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
    };
  }, []);

  const bootSession = async (session) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    // Blokir user non-aktif
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
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      console.error(error);
      setTasks([]);
    } else setTasks(data || []);
  };

  // ─── Task CRUD ────────────────────────────────────────────────────────────────

  const handleSubmit = async (formData) => {
    if (!session) return;

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
      priority: formData.priority,
      created_by: session.user.id,
      assignee_ids: assigneeIds,
      assigned_to_name: assigneeNames,
      status: editingTask?.status || "todo",
      is_weekend_task: false,
      is_comday: formData.task_type === "libur_pengganti",
      task_type: formData.task_type,
      priority: "medium",
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
      await fetchTasks();

      // Kirim notif Telegram (fire & forget, gak blokir UI)
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: taskData,
          assigneeIds,
          actorName: userProfile?.full_name || session.user.email,
          action: editingTask ? "updated" : "created",
        }),
      }).catch(() => {}); // silent fail jika Telegram belum dikonfigurasi

      closeForm();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (taskId) => {
    if (!confirm("Hapus jadwal ini?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const openNewForm = () => {
    setEditingTask(null);
    setShowForm(true);
  };

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
        setViewMode={setViewMode}
        handleLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">
              {viewMode === "dashboard" && "Dashboard"}
              {viewMode === "calendar" && "Kalender Jadwal"}
              {viewMode === "list" && "Semua Jadwal"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })}
            </p>
          </div>

          <button
            onClick={openNewForm}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Jadwal</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Views */}
        {viewMode === "dashboard" && (
          <DashboardView tasks={tasks} users={users} />
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
      </main>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          users={users}
          editingTask={editingTask}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}
