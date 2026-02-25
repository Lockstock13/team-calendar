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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGlobalContext } from "@/app/providers";

export default function Header({
  session,
  userProfile,
  handleLogout,
  unreadChat = 0,
}) {
  const pathname = usePathname();
  const { language } = useGlobalContext();
  const lang = language || "en";

  const isAdmin = userProfile?.role === "admin";
  const initial = (userProfile?.full_name || session?.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  const navItems = [
    { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", path: "/calendar", label: lang === "id" ? "Kalender" : "Calendar", icon: Calendar },
    { id: "list", path: "/list", label: lang === "id" ? "Daftar" : "List", icon: LayoutList },
    { id: "notes", path: "/notes", label: lang === "id" ? "Catatan" : "Notes", icon: FileText },
    { id: "report", path: "/report", label: lang === "id" ? "Laporan" : "Report", icon: BarChart2 },
    { id: "chat", path: "/chat", label: "Chat", icon: MessageCircle, badge: unreadChat },
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
            {navItems.map(({ id, path, label, icon: Icon, badge }) => {
              const isActive = pathname === path || (path === '/dashboard' && pathname === '/');
              return (
                <Link
                  key={id}
                  href={path}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
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
              {userProfile?.full_name || (lang === "id" ? "Profil" : "Profile")}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
            title={lang === "id" ? "Keluar" : "Log out"}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
