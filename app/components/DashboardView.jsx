"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import { id, enUS } from "date-fns/locale";
import {
  Square,
  Calendar,
  Circle,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import Avatar from "@/app/components/Avatar";



// --- Minimalist Badge ---
function TypeBadge({ task, lang }) {
  if (task.is_comday || task.task_type === "libur_pengganti") {
    return (
      <span className="text-[10px] bg-red-50/70 text-red-600/90 dark:bg-red-900/30 dark:text-red-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-red-100/50 dark:border-red-900/40">
        {lang === "id" ? "Cuti/Libur" : "Leave"}
      </span>
    );
  }
  if (task.is_weekend_task) {
    return (
      <span className="text-[10px] bg-amber-50/70 text-amber-600/90 dark:bg-amber-900/30 dark:text-amber-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-amber-100/50 dark:border-amber-900/40">
        {lang === "id" ? "Akhir Pekan" : "Wknd"}
      </span>
    );
  }
  return null;
}

// --- Table Row Item (Notion-like list) ---
function TaskRow({ task, users, lang, onClick, index = 0 }) {
  const assignees = (task.assignee_ids || [])
    .map((uid) => users.find((u) => u.id === uid))
    .filter(Boolean);

  const isDone = task.status === "done";
  const isInProgress = task.status === "in_progress";

  const dotColor = isDone
    ? "bg-emerald-500"
    : isInProgress
      ? "bg-blue-500"
      : "bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-500";

  return (
    <div
      onClick={() => onClick && onClick(task)}
      className="group flex items-center gap-3 py-2.5 sm:py-2 px-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-all duration-200 cursor-pointer border border-transparent hover:border-border hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${index * 50}ms`, animationDuration: "300ms" }}
    >
      {/* Status dot bullet */}
      <div className={`w-2 h-2 rounded-full transition-colors flex-shrink-0 ml-1 ${dotColor} ${isDone ? "opacity-50" : ""}`}></div>

      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2">
          <p className={`text-[13.5px] font-medium truncate tracking-tight transition-colors ${isDone ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground/90 group-hover:text-foreground"}`}>
            {task.title}
          </p>
          <TypeBadge task={task} lang={lang} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 flex-shrink-0 ml-auto">
        <span className="text-[11px] text-muted-foreground/80 font-medium hidden md:block max-w-[120px] truncate text-right">
          {task.assigned_to_name || "—"}
        </span>
        <div className="flex gap-1 justify-end">
          {assignees.slice(0, 3).map((u) => (
            <Avatar key={u.id} user={u} size="xs" />
          ))}
          {assignees.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-700 border border-border flex items-center justify-center text-[9px] font-medium text-muted-foreground z-10 font-sans">
              +{assignees.length - 3}
            </div>
          )}
        </div>
      </div>
      {/* Hover arrow micro-interaction */}
      <div className="opacity-0 group-hover:opacity-100 transition-transform duration-200 transform translate-x-[-4px] group-hover:translate-x-0 text-muted-foreground/80 flex-shrink-0">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}

// ─── My Schedule Panel ─────────────────────────────────────────────────────────

function MySchedulePanel({ tasks, users, currentUserId, lang, onTaskClick }) {
  const now = new Date();
  const monthStart = format(
    new Date(now.getFullYear(), now.getMonth(), 1),
    "yyyy-MM-dd",
  );
  const monthEnd = format(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
    "yyyy-MM-dd",
  );
  const localeObj = lang === "id" ? id : enUS;

  const myTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            (t.assignee_ids || []).includes(currentUserId) &&
            t.start_date >= monthStart &&
            t.start_date <= monthEnd,
        )
        .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || "")),
    [tasks, currentUserId, monthStart, monthEnd],
  );

  return (
    <div className="flex flex-col h-full bg-background/95 rounded-xl border border-border shadow-sm">
      {/* Header compact Notion-style */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground/80" />
          <h2 className="text-[13px] font-medium tracking-tight text-foreground dark:text-zinc-100">
            {lang === "id" ? "Jadwal Saya" : "My Schedule"}
          </h2>
        </div>
        <div className="text-[11px] font-medium text-muted-foreground bg-background border border-border px-2 py-0.5 rounded shadow-sm">
          {myTasks.length} {lang === "id" ? "Tugas" : "Tasks"}
        </div>
      </div>

      {/* Task list compact */}
      <div className="flex-1 p-1.5 overflow-hidden flex flex-col">
        {myTasks.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground/80 h-full">
            <span className="text-3xl mb-3 opacity-60">🎮</span>
            <p className="text-[13px] font-medium text-muted-foreground">
              {lang === "id"
                ? "All clear boss! Waktunya ngopi."
                : "All clear boss! Time for coffee."}
            </p>
          </div>
        ) : (
          <div
            className="overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ maxHeight: "350px" }}
          >
            <div className="space-y-1">
              {myTasks.map((task, index) => {
                const dateStr = task.start_date
                  ? format(new Date(task.start_date + "T00:00:00"), "d MMM", {
                    locale: localeObj,
                  })
                  : "-";
                const isLibur =
                  task.is_comday || task.task_type === "libur_pengganti";
                const isDone = task.status === "done";

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick && onTaskClick(task)}
                    className="group flex items-start gap-2.5 py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-all duration-200 cursor-pointer border border-transparent hover:border-border hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-right-2 fill-mode-both"
                    style={{ animationDelay: `${index * 50}ms`, animationDuration: "300ms" }}
                  >
                    {/* Minimalist Date Box */}
                    <div className="w-10 pt-0.5 flex-shrink-0 text-right">
                      <span
                        className={`text-[11px] font-medium block tracking-wide ${isLibur ? "text-red-400/80 dark:text-red-500/80" : isDone ? "text-muted-foreground/60" : "text-muted-foreground/80 group-hover:text-foreground dark:group-hover:text-zinc-100"}`}
                      >
                        {dateStr}
                      </span>
                    </div>
                    {/* Divider line */}
                    <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-700 mt-0.5 flex-shrink-0 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600 transition-colors" />
                    {/* Title */}
                    <span
                      className={`flex-1 text-[13px] font-medium tracking-tight ${isLibur || isDone ? "text-muted-foreground/80 line-through decoration-muted-foreground/30" : "text-foreground/90 group-hover:text-foreground dark:text-zinc-200 dark:group-hover:text-zinc-100 font-semibold"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard (Notion Style) ─────────────────────────────────────────────

export default function DashboardView({ tasks, users, currentUserId }) {
  const { language } = useGlobalContext();
  const lang = language || "en";
  const [previewTask, setPreviewTask] = useState(null);

  const {
    todayTasks,
    tomorrowTasks,
    monthTasks,
  } = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const monthStart = format(startOfMonth, "yyyy-MM-dd");

    return {
      todayTasks: tasks.filter((t) => t.start_date === todayStr),
      tomorrowTasks: tasks.filter((t) => t.start_date === tomorrowStr),
      monthTasks: tasks.filter((t) => t.start_date >= monthStart),
    };
  }, [tasks]);


  const currentHour = new Date().getHours();
  let greeting = lang === "id" ? '"Selamat malam..." 🌙' : '"Good evening..." 🌙';
  if (currentHour >= 5 && currentHour < 12)
    greeting =
      lang === "id"
        ? '"Pagi team, gas ngopi dulu..." ☕'
        : '"Morning team, let\'s grab coffee..." ☕';
  else if (currentHour >= 12 && currentHour < 15)
    greeting =
      lang === "id"
        ? '"Panas nih, tetep biasakan fokus ya..." ☀️'
        : '"It\'s hot outside, stay focused..." ☀️';
  else if (currentHour >= 15 && currentHour < 18)
    greeting =
      lang === "id"
        ? '"Sore team, dikit lagi kelar..." 🌅'
        : '"Afternoon team, almost done..." 🌅';
  else
    greeting =
      lang === "id"
        ? '"Waktunya rehat, besok lanjut lagi..." 🌙'
        : '"Time to rest, continue tomorrow..." 🌙';

  return (
    <div className="w-full space-y-6 pb-12 pt-2 lg:pt-4">
      {/* Personal Greeting */}
      <div className="mb-2 px-1 text-center">
        <p className="text-[13.5px] sm:text-[14.5px] font-medium italic tracking-tight text-muted-foreground animate-fade-in">
          {greeting}
        </p>
      </div>

      {/* Minimalist Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Today */}
        <div className="bg-background/95 border border-border rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
          <div className="flex items-center gap-2 text-muted-foreground/80 mb-2 sm:mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] sm:text-[12px] font-semibold tracking-wider uppercase">
              {lang === "id" ? "Hari Ini" : "Today"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-foreground dark:text-zinc-100 tracking-tight leading-none">
              {todayTasks.length}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/60 tracking-wide">
              {lang === "id" ? "Jadwal" : "Tasks"}
            </span>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-background/95 border border-border rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
          <div className="flex items-center gap-2 text-muted-foreground/80 mb-2 sm:mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[10px] sm:text-[12px] font-semibold tracking-wider uppercase">
              {lang === "id" ? "Bulan Ini" : "This Month"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-foreground dark:text-zinc-100 tracking-tight leading-none">
              {monthTasks.length}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/60 tracking-wide">
              {lang === "id" ? "Jadwal" : "Tasks"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 items-start mt-2 sm:mt-4">
        {/* Left Column: Agenda (Hari Ini + Besok) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda Grid (Responsive) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-8">
            {/* Hari Ini Section */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/80"></span>
                <h2 className="font-bold text-[13px] sm:text-[14px] tracking-tight text-foreground dark:text-zinc-100 uppercase">
                  {lang === "id" ? "Agenda Hari Ini ⚡" : "Today's Agenda ⚡"}
                </h2>
              </div>

              <div className="bg-background/95 dark:bg-zinc-900/50 border border-border rounded-xl overflow-hidden shadow-sm h-auto">
                {todayTasks.length === 0 ? (
                  <div className="px-5 py-8 flex items-center justify-center flex-col text-muted-foreground/80 bg-transparent h-full">
                    <span className="text-2xl mb-2">🌬️</span>
                    <span className="text-[13px] font-medium text-muted-foreground text-center max-w-[200px]">
                      {lang === "id"
                        ? "Kosong nih. Bisa nyantai."
                        : "Clear horizons. Relax."}
                    </span>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-0.5">
                    {todayTasks.map((t, i) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        users={users}
                        lang={lang}
                        onClick={setPreviewTask}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Besok Section */}
            <div className={tomorrowTasks.length === 0 ? "hidden sm:block" : ""}>
              <div className="flex items-center gap-2 mb-2 px-1 mt-0">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                <h2 className="font-bold text-[13px] sm:text-[14px] tracking-tight text-foreground dark:text-zinc-100 uppercase">
                  {lang === "id" ? "Besok 🚀" : "Tomorrow 🚀"}
                </h2>
              </div>

              <div className="bg-background/95 dark:bg-zinc-900/50 border border-border rounded-xl overflow-hidden shadow-sm h-auto">
                {tomorrowTasks.length === 0 ? (
                  <div className="px-5 py-8 flex items-center justify-center flex-col text-muted-foreground/80 bg-transparent h-full">
                    <span className="text-2xl mb-2">☁️</span>
                    <span className="text-[13px] font-medium text-muted-foreground text-center max-w-[200px]">
                      {lang === "id"
                        ? "Besok belum ada apa-apa."
                        : "Nothing for tomorrow yet."}
                    </span>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-0.5">
                    {tomorrowTasks.map((t, i) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        users={users}
                        lang={lang}
                        onClick={setPreviewTask}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Schedule */}
        <div className="w-full lg:sticky lg:top-24 h-auto lg:h-[calc(100vh-140px)] min-h-[220px] mb-6 lg:mb-0">
          <MySchedulePanel
            tasks={tasks}
            users={users}
            currentUserId={currentUserId}
            lang={lang}
            onTaskClick={setPreviewTask}
          />
        </div>
      </div>

      {/* Task Preview Modal */}
      {previewTask && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewTask(null)}
        >
          <div
            className="bg-background w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Type Accent */}
            <div
              className={`h-1.5 ${previewTask.is_comday || previewTask.task_type === "libur_pengganti" ? "bg-emerald-400" : "bg-zinc-800"}`}
            />

            <div className="p-6">
              <button
                onClick={() => setPreviewTask(null)}
                className="absolute top-4 right-4 p-1.5 text-muted-foreground/80 hover:bg-muted hover:text-foreground rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <TypeBadge task={previewTask} lang={lang} />
                    {previewTask.status === "done" && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-emerald-500/20">
                        {lang === "id" ? "Selesai" : "Done"}
                      </span>
                    )}
                    {previewTask.status === "in_progress" && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 tracking-wide px-2 py-0.5 rounded-sm font-medium whitespace-nowrap border border-blue-500/20">
                        {lang === "id" ? "Sedang Berjalan" : "In Progress"}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-lg font-bold mt-2 leading-tight ${previewTask.status === "done" ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground dark:text-zinc-100"}`}>
                    {previewTask.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {previewTask.start_date
                      ? format(
                        new Date(previewTask.start_date + "T00:00:00"),
                        "EEEE, d MMM yyyy",
                        { locale: lang === "id" ? id : enUS },
                      )
                      : "—"}
                  </p>
                </div>

                {previewTask.description && (
                  <div className="pt-2">
                    <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                      {lang === "id" ? "Catatan" : "Notes"}
                    </p>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border">
                      <p className="text-[13px] text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                        {previewTask.description}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                    {lang === "id" ? "Tim Penugasan" : "Assigned Team"}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(previewTask.assignee_ids || []).map((uid) => {
                      const u = users.find((user) => user.id === uid);
                      if (!u) return null;
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-2 bg-background border border-border pl-1 pr-3 py-1 rounded-full shadow-sm"
                        >
                          <Avatar user={u} size="sm" />
                          <span className="text-[12px] font-medium text-foreground/90">
                            {u.full_name || u.email.split("@")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setPreviewTask(null)}
                  className="px-5 py-2 bg-background border hover:bg-zinc-50 dark:hover:bg-zinc-800 border-border text-foreground/90 rounded-xl text-sm font-semibold transition-colors active:scale-95 shadow-sm"
                >
                  {lang === "id" ? "Tutup" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
