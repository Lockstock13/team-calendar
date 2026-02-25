"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  LayoutList,
  FileText,
  BarChart2,
  MessageCircle,
  Moon,
  Sun
} from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import { useTheme } from "next-themes";

export default function MobileNav({ unreadChat = 0 }) {
  const pathname = usePathname();
  const { language } = useGlobalContext();
  const lang = language || "en";
  const { theme, setTheme } = useTheme();

  const items = [
    {
      id: "dashboard",
      path: "/dashboard",
      label: lang === "id" ? "Beranda" : "Home",
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
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t bg-background/90 backdrop-blur-md sm:hidden">
      <div className="max-w-7xl mx-auto px-1">
        <div className="flex justify-between items-center h-14">
          <div className="grid grid-cols-6 items-stretch flex-1">
            {items.map(({ id, path, label, icon: Icon, badge }) => {
              const isActive =
                pathname === path || (path === "/dashboard" && pathname === "/");

              return (
                <Link
                  key={id}
                  href={path}
                  className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isActive ? "bg-muted" : "bg-transparent"
                      }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </div>
                  <span className="leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors text-muted-foreground hover:text-foreground px-2"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-transparent">
              {theme === "dark" ? (
                <Sun className="w-[18px] h-[18px]" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
            </div>
            <span className="leading-none">Tema</span>
          </button>
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
