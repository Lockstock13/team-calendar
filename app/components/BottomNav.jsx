"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  LayoutList,
  MessageCircle,
  MoreHorizontal,
  FileText,
  BarChart2,
  Shield,
  Plus,
  X,
  CalendarPlus,
  NotebookPen,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";

export default function BottomNav({
  viewMode,
  setViewMode,
  unreadChat = 0,
  isAdmin = false,
  onAddTask,
  onAddNote,
  isDark = false,
  toggleDark,
}) {
  const [showMore, setShowMore] = useState(false);
  const [showFab, setShowFab] = useState(false);

  const leftItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "calendar", label: "Kalender", icon: Calendar },
  ];

  const rightItems = [
    { id: "chat", label: "Chat", icon: MessageCircle, badge: unreadChat },
  ];

  const moreItems = [
    { id: "list", label: "Semua Jadwal", icon: LayoutList },
    { id: "notes", label: "Catatan", icon: FileText },
    { id: "report", label: "Laporan", icon: BarChart2 },
  ];

  const isMoreActive = ["list", "notes", "report"].includes(viewMode);

  const handleNav = (id) => {
    setViewMode(id);
    setShowMore(false);
    setShowFab(false);
  };

  const handleFabAction = (action) => {
    setShowFab(false);
    if (action === "task") {
      onAddTask?.();
    } else if (action === "note") {
      onAddNote?.();
    }
  };

  const closeFab = () => setShowFab(false);
  const closeMore = () => setShowMore(false);

  const renderNavButton = ({ id, label, icon: Icon, badge }) => (
    <button
      key={id}
      onClick={() => handleNav(id)}
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
        viewMode === id ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* ── FAB popup overlay ────────────────────────────────────────────────── */}
      {showFab && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 sm:hidden"
          onClick={closeFab}
        >
          {/* FAB action buttons — positioned above the center FAB */}
          <div
            className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tambah Catatan */}
            <button
              onClick={() => handleFabAction("note")}
              className="flex items-center gap-3 bg-background border shadow-lg rounded-2xl pl-4 pr-5 py-3 active:scale-95 transition-all animate-fab-item-2"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <NotebookPen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Tambah Catatan</p>
                <p className="text-[11px] text-muted-foreground">
                  Buat catatan baru
                </p>
              </div>
            </button>

            {/* Tambah Jadwal */}
            <button
              onClick={() => handleFabAction("task")}
              className="flex items-center gap-3 bg-background border shadow-lg rounded-2xl pl-4 pr-5 py-3 active:scale-95 transition-all animate-fab-item-1"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <CalendarPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Tambah Jadwal</p>
                <p className="text-[11px] text-muted-foreground">
                  Buat jadwal baru
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── More menu overlay ────────────────────────────────────────────────── */}
      {showMore && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={closeMore}
        >
          <div
            className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] right-3 px-1 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background border rounded-2xl shadow-xl overflow-hidden min-w-[200px]">
              {moreItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  className={`flex items-center gap-3 w-full px-5 py-3.5 text-sm font-medium transition-colors ${
                    viewMode === id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors border-t"
                >
                  <Shield className="w-5 h-5" />
                  Admin Panel
                </Link>
              )}
              {/* Dark mode toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDark?.();
                }}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors border-t"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-500" />
                )}
                {isDark ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom nav bar ───────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-lg border-t z-50 sm:hidden">
        <div className="flex items-center h-14 pb-safe relative">
          {/* Left items */}
          {leftItems.map(renderNavButton)}

          {/* Center FAB spacer */}
          <div className="flex-1 h-full" />

          {/* Right items */}
          {rightItems.map(renderNavButton)}

          {/* More button */}
          <button
            onClick={() => {
              setShowMore((v) => !v);
              setShowFab(false);
            }}
            aria-label="Menu lainnya"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
              isMoreActive || showMore
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {showMore ? (
              <X className="w-5 h-5" />
            ) : (
              <MoreHorizontal className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium leading-tight">
              Lainnya
            </span>
          </button>

          {/* ── Center FAB (raised) ──────────────────────────────────────────── */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-4">
            <button
              onClick={() => {
                setShowFab((v) => !v);
                setShowMore(false);
              }}
              aria-label="Tambah baru"
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                showFab
                  ? "bg-muted text-foreground rotate-45"
                  : "bg-primary text-primary-foreground"
              }`}
              style={{
                boxShadow: showFab
                  ? "0 4px 12px rgba(0,0,0,0.1)"
                  : "0 4px 16px rgba(0,0,0,0.2)",
              }}
            >
              <Plus className="w-7 h-7 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
