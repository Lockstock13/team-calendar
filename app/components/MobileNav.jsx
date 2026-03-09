"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  LayoutList,
  FileText,
  BarChart2,
  MessageCircle,
} from "lucide-react";
import { useGlobalContext } from "@/app/providers";

export default function MobileNav({ unreadChat = 0 }) {
  const pathname = usePathname();
  const { language, appSettings } = useGlobalContext();
  const lang = language || "en";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
      label: lang === "id" ? "Obrolan" : "Chat",
      icon: MessageCircle,
      badge: unreadChat,
    },
  ];

  const filteredItems = items.filter((item) => {
    if (item.id === "chat") return appSettings?.enable_chat !== false;
    if (item.id === "notes") return appSettings?.enable_notes !== false;
    if (item.id === "report") return appSettings?.enable_report !== false;
    return true;
  });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-background border-t pb-safe">
      <div className="flex items-center justify-evenly h-14 px-1 max-w-lg mx-auto w-full">
        {filteredItems.map(({ id, path, label, icon: Icon, badge }) => {
          const isActive =
            pathname === path || (path === "/dashboard" && pathname === "/");

          return (
            <Link
              key={id}
              href={path}
              className={`flex-1 flex flex-col items-center justify-center h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive ? 'font-bold' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
