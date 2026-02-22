"use client";

import {
  Calendar,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Shield,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function Header({
  session,
  userProfile,
  viewMode,
  setViewMode,
  handleLogout,
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
  ];

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-sm hidden sm:inline">
              Still Photo
            </span>
          </div>

          <nav className="flex gap-0.5">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Admin + Profile + Logout */}
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          <Link
            href="/profile"
            className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-background"
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
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
