"use client";

import {
  Calendar,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Shield,
  FileText,
  BarChart2,
  MessageCircle,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";

export default function Header({
  session,
  userProfile,
  viewMode,
  setViewMode,
  handleLogout,
  unreadChat = 0,
  isDark = false,
  toggleDark,
}) {
  const isAdmin = userProfile?.role === "admin";
  const initial = (userProfile?.full_name || session?.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Kalender", icon: Calendar },
    { id: "list", label: "List", icon: LayoutList },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "report", label: "Report", icon: BarChart2 },
    { id: "chat", label: "Chat", icon: MessageCircle, badge: unreadChat },
  ];

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-2 sm:gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            {/* Always show brand name — mobile nav is now in BottomNav */}
            <span className="font-bold tracking-tight text-sm">
              Still Photo
            </span>
          </div>

          {/* Desktop-only nav — hidden on mobile, BottomNav handles it */}
          <nav className="hidden sm:flex gap-0.5">
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                aria-label={label}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                  viewMode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Admin + Profile + Logout */}
        <div className="flex items-center gap-1">
          {/* Dark mode toggle — desktop */}
          {toggleDark && (
            <button
              onClick={toggleDark}
              aria-label={isDark ? "Light mode" : "Dark mode"}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all min-h-[40px]"
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Admin</span>
            </Link>
          )}

          <Link
            href="/profile"
            aria-label="Profil"
            className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all min-h-[40px]"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-background flex-shrink-0"
              style={{ backgroundColor: userProfile?.color || "#64748b" }}
            >
              {initial}
            </div>
            <span className="hidden md:inline text-foreground text-sm">
              {userProfile?.full_name || "Profil"}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
