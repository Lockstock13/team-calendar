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
import {
  DashboardSkeleton,
  CalendarSkeleton,
  ListSkeleton,
  NotesSkeleton,
  ReportSkeleton,
  ChatSkeleton,
  PageSkeleton,
} from "@/app/components/Skeletons";
import { useTaskActions } from "@/app/hooks/useTaskActions";

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

// Convert hex to HSL for Tailwind CSS variable
const hexToHslString = (hex) => {
  if (!hex) return "222.2 47.4% 11.2%"; // default primary
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
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
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [language, setLanguageState] = useState("en");
  const [appSettings, setAppSettings] = useState({
    app_name: "Team Calendar",
    logo_url: null,
    primary_color: "#0ea5e9",
    enable_chat: true,
    enable_notes: true,
    enable_report: true,
  });

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .single();
      if (error) {
        console.warn(
          "[settings] app_settings not available:",
          error.message,
          "— using defaults.",
        );
        return;
      }
      if (data) {
        setAppSettings({
          ...data,
          app_name: data.app_name || "Team Calendar",
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || "#0ea5e9",
          enable_chat: data.enable_chat ?? true,
          enable_notes: data.enable_notes ?? true,
          enable_report: data.enable_report ?? true,
        });
      }
    } catch (err) {
      console.warn(
        "[settings] Failed to fetch app settings:",
        err.message,
        "— using defaults.",
      );
    }
  };

  useEffect(() => {
    fetchSettings();
    const stored = localStorage.getItem("app_lang");
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  // Clear unread chat badge when entering chat.
  // Keep hook near top-level so hook order stays stable.
  useEffect(() => {
    if (pathname === "/chat" && unreadChat > 0) {
      setUnreadChat(0);
    }
  }, [pathname, unreadChat]);

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
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) => {
            if (prev.find((t) => t.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        },
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

  // ── Task CRUD (extracted to hook) ──────────────────────────────────────────
  const {
    showForm,
    setShowForm,
    editingTask,
    setEditingTask,
    submitting,
    handleTaskSubmit,
    handleEditTask,
    handleDeleteTask,
    handleUpdateStatus: handleUpdateTaskStatus,
  } = useTaskActions({
    session,
    userProfile,
    users,
    language,
    onSuccess: fetchTasks,
  });

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
    const renderSkeletonContent = () => {
      if (pathname === "/dashboard" || pathname === "/")
        return <DashboardSkeleton />;
      if (pathname === "/calendar") return <CalendarSkeleton />;
      if (pathname === "/list") return <ListSkeleton />;
      if (pathname === "/notes") return <NotesSkeleton />;
      if (pathname === "/report") return <ReportSkeleton />;
      if (pathname === "/chat") return <ChatSkeleton />;
      return <PageSkeleton />;
    };

    return (
      <GlobalContext.Provider value={{ language, appSettings, session: null }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {appSettings?.primary_color && (
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  :root, .dark {
                    --primary: ${hexToHslString(appSettings.primary_color)};
                    --primary-foreground: 0 0% 100%;
                  }
                `,
              }}
            />
          )}
          <div className="min-h-screen bg-muted/20">
            <Header
              session={null}
              userProfile={null}
              handleLogout={() => { }}
              unreadChat={0}
            />
            {/* The wrapper mimicking PageContainer but without the title since skeletons handle layout spacing inside them or assume them */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 pb-6 sm:py-6">
              {renderSkeletonContent()}
            </main>
            <MobileNav unreadChat={0} />
          </div>
        </ThemeProvider>
      </GlobalContext.Provider>
    );
  }

  if (inactiveBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm bg-background border rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="font-bold text-lg">
            {language === "id" ? "Akun Dinonaktifkan" : "Account Deactivated"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {language === "id"
              ? "Akun kamu telah dinonaktifkan oleh admin. Hubungi admin untuk mengaktifkan kembali."
              : "Your account has been deactivated by an admin. Contact your admin to reactivate."}
          </p>
          <button
            onClick={() => {
              supabase.auth.signOut();
              setInactiveBlock(false);
            }}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            {language === "id" ? "Kembali ke Login" : "Back to Login"}
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthForm
        onAuth={handleAuth}
        loading={authLoading}
        error={authError}
        lang={language || "en"}
        appSettings={appSettings}
      />
    );
  }

  return (
    <GlobalContext.Provider
      value={{
        session,
        userProfile,
        tasks,
        users,
        appSettings,
        setTasks,
        fetchTasks,
        fetchSettings,
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
        {appSettings?.primary_color && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
              :root, .dark {
                --primary: ${hexToHslString(appSettings.primary_color)};
                --primary-foreground: 0 0% 100%;
              }
            `,
            }}
          />
        )}
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
