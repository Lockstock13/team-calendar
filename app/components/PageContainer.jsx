"use client";

import { format } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import { Plus } from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import ErrorBoundary from "./ErrorBoundary";
import PullToRefresh from "./PullToRefresh";

export default function PageContainer({
  title,
  hideAddButton = false,
  children,
}) {
  const { setShowForm, setEditingTask, language } = useGlobalContext();
  const lang = language || "en";

  const openNewForm = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  return (
    <PullToRefresh>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 pb-6 sm:py-6 space-y-4 opacity-0 animate-fade-in">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p
              className="text-sm text-muted-foreground/80"
              suppressHydrationWarning
            >
              {format(new Date(), "EEEE, d MMMM yyyy", {
                locale: lang === "id" ? idLocale : enUS,
              })}
            </p>
          </div>

          {!hideAddButton && (
            <button
              onClick={openNewForm}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lang === "id" ? "Tambah Jadwal" : "Add Task"}
              </span>
              <span className="sm:hidden">
                {lang === "id" ? "Tambah" : "Add"}
              </span>
            </button>
          )}
        </div>

        {/* Content */}
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </PullToRefresh>
  );
}
