"use client";

import { useState } from "react";
import {
  Calendar,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Shield,
  FileText,
  BarChart2,
  MessageCircle,
  X,
  Aperture,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useGlobalContext } from "@/app/providers";
import Logo from "./Logo";

export default function Header({
  session,
  userProfile,
  handleLogout,
  unreadChat = 0,
}) {
  const pathname = usePathname();
  const { language, appSettings } = useGlobalContext();
  const lang = language || "en";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const isAdmin = userProfile?.role === "admin";
  const initial = (userProfile?.full_name || session?.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  const navItems = [
    {
      id: "dashboard",
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "calendar",
      path: "/calendar",
      label: lang === "id" ? "Kalender" : "Calendar",
      icon: Calendar,
    },
    {
      id: "list",
      path: "/list",
      label: lang === "id" ? "Daftar" : "List",
      icon: LayoutList,
    },
    {
      id: "notes",
      path: "/notes",
      label: lang === "id" ? "Catatan" : "Notes",
      icon: FileText,
    },
    {
      id: "report",
      path: "/report",
      label: lang === "id" ? "Laporan" : "Report",
      icon: BarChart2,
    },
    {
      id: "chat",
      path: "/chat",
      label: "Chat",
      icon: MessageCircle,
      badge: unreadChat,
    },
  ];

  return (
    <>
      <header className="border-b bg-background 80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              {appSettings?.logo_url ? (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/30 overflow-hidden">
                  <img src={appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Logo className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <span className="font-bold tracking-tight text-[15px] sm:text-sm">
                {appSettings?.app_name || "Team Calendar"}
              </span>
            </div>

            <nav className="hidden sm:flex gap-0.5">
              {navItems.map(({ id, path, label, icon: Icon, badge }) => {
                const isActive =
                  pathname === path ||
                  (path === "/dashboard" && pathname === "/");
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
            {/* Mobile Profile/Theme Triggers */}
            <div className="sm:hidden flex items-center gap-1.5 mr-0.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              >
                {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
                  style={{ backgroundColor: userProfile?.color || "#64748b" }}
                >
                  {initial}
                </div>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-1">
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
                  {userProfile?.full_name ||
                    (lang === "id" ? "Profil" : "Profile")}
                </span>
              </Link>

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                title={lang === "id" ? "Ganti Tema" : "Toggle Theme"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                title={lang === "id" ? "Keluar" : "Log out"}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-2xl border-t shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {lang === "id" ? "Akun Saya" : "My Account"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.full_name || session?.user?.email}
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-background"
                style={{ backgroundColor: userProfile?.color || "#64748b" }}
              >
                {initial}
              </div>
              <span>{lang === "id" ? "Profil" : "Profile"}</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === "id" ? "Keluar" : "Log out"}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
