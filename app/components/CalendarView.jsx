"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { X } from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import { useToast } from "@/app/components/ToastProvider";
import { supabase } from "@/lib/supabase";
import Avatar from "@/app/components/Avatar";
import TaskDetailModal from "@/app/components/TaskDetailModal";



// ─── Holiday Detail Modal ──────────────────────────────────────────────────────

function HolidayModal({ holiday, onClose, lang }) {
  if (!holiday) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-red-400" />
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-muted-foreground/80 hover:bg-zinc-100 hover:text-zinc-600 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-4 pt-1">
            <div className="mb-2">
              <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-sm font-medium border border-red-100/50">
                🇮🇩 {lang === "id" ? "Libur Nasional" : "Public Holiday"}
              </span>
              <h3 className="text-lg font-bold text-foreground leading-tight mt-3">
                {holiday.localName || holiday.name}
              </h3>
              {holiday.localName !== holiday.name && (
                <p className="text-[13px] text-muted-foreground mt-1">{holiday.name}</p>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                {lang === "id" ? "Tanggal" : "Date"}
              </p>
              <span className="text-[14px] font-medium text-foreground">
                {format(
                  new Date(holiday.date + "T00:00:00"),
                  "EEEE, d MMMM yyyy",
                  {
                    locale: lang === "id" ? id : enUS,
                  },
                )}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-background border hover:bg-zinc-50 dark:hover:bg-zinc-800 border-border text-foreground/90 rounded-xl text-sm font-semibold transition-colors active:scale-95 shadow-sm"
            >
              {lang === "id" ? "Tutup" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fetch Indonesian public holidays from libur.deno.dev (with localStorage cache) ─

async function fetchHolidays(year) {
  const CACHE_KEY = `holidays_libur_${year}`;
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  try {
    // Check localStorage cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
        return data;
      }
    }
  } catch { /* ignore parse errors */ }

  try {
    const res = await fetch(`https://libur.deno.dev/api?year=${year}`);
    if (!res.ok) return [];
    const raw = await res.json();

    // Normalize: API returns { date, name }
    // Map to { date, name, localName } for compatibility with template below
    const data = (Array.isArray(raw) ? raw : []).map((h) => ({
      date: h.date,
      name: h.name,
      localName: h.name,
    }));

    // Store in localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded — ignore */ }

    return data;
  } catch {
    return [];
  }
}

// ─── Main CalendarView ─────────────────────────────────────────────────────────

export default function CalendarView({ tasks, users, onEdit, onDelete, currentUserId }) {
  const { language } = useGlobalContext();
  const { addToast } = useToast();
  const lang = language || "en";
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // ── Fetch holidays for current year (+ next year) & check mobile ─────────
  useEffect(() => {
    const year = new Date().getFullYear();
    const months = new Date().getMonth(); // 0-based
    const years = months >= 10 ? [year, year + 1] : [year];

    Promise.all(years.map(fetchHolidays)).then((results) => {
      setHolidays(results.flat());
    });

    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Filtered tasks ──────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      filterUserId
        ? tasks.filter((t) => (t.assignee_ids || []).includes(filterUserId))
        : tasks,
    [tasks, filterUserId],
  );

  // ── Build FullCalendar event objects ────────────────────────────────────────
  // Each task is EXPANDED into one event per assignee so every member gets
  // their own colour block. Event id = "{taskId}-{userId}".

  const calendarEvents = useMemo(() => {
    const taskEvents = filtered.flatMap((task) => {
      const assigneeIds = task.assignee_ids || [];

      // FullCalendar end date is EXCLUSIVE — compute in local time.
      const rawEnd =
        task.end_date && task.end_date >= task.start_date
          ? task.end_date
          : task.start_date;
      const [ey, em, ed] = rawEnd.split("-").map(Number);
      const next = new Date(ey, em - 1, ed + 1);
      const endStr = [
        next.getFullYear(),
        String(next.getMonth() + 1).padStart(2, "0"),
        String(next.getDate()).padStart(2, "0"),
      ].join("-");

      const isComday = task.is_comday || task.task_type === "libur_pengganti";
      const isWeekend = task.is_weekend_task;

      // Base colors for the single compact mobile block event (we also use this as fallback)
      // comday = pink pastel, weekend = purple, regular = neutral
      let defaultBgColor = isComday ? "#fce7f3" : isWeekend ? "#a855f7" : "#f1f5f9";
      let defaultBorderColor = isComday ? "#f9a8d4" : isWeekend ? "#a855f7" : "#cbd5e1";
      let defaultTextColor = isComday ? "#be185d" : isWeekend ? "#ffffff" : "#334155";
      const defaultClassNames = (isComday || isWeekend) ? [] : ["!bg-zinc-100", "dark:!bg-zinc-800", "!border-zinc-200", "dark:!border-zinc-700", "!text-zinc-800", "dark:!text-zinc-200"];

      // If there are no assignees or if we are rendering for MOBILE, emit only one block
      if (assigneeIds.length === 0 || isMobile) {
        return [
          {
            id: task.id,
            title: task.title,
            start: task.start_date,
            end: endStr,
            allDay: true,
            backgroundColor: defaultBgColor,
            borderColor: defaultBorderColor,
            textColor: defaultTextColor,
            classNames: defaultClassNames,
            extendedProps: { type: "task", task, assigneeIds, isComday, isWeekend },
          },
        ];
      }

      // If DESKTOP and has assignees: map each assignee to its own event bar
      return assigneeIds.map((uid) => {
        const user = users.find((u) => u.id === uid);
        // comday = pink pastel, weekend = consistent purple, else = user color
        const color = isComday ? "#f472b6" : isWeekend ? "#a855f7" : user?.color || "#64748b";
        const textColor = isComday ? "#7c3aed" : "#fff";
        const name = user?.full_name || user?.email?.split("@")[0] || "?";
        const prefix = isComday ? "🏖️ " : isWeekend ? "🌙 " : "";

        return {
          id: `${task.id}-${uid}`,
          title: `${prefix}${task.title} · ${name}`,
          start: task.start_date,
          end: endStr,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: textColor,
          extendedProps: { type: "task", task, assigneeIds: [], isComday, isWeekend },
        };
      });
    });

    // Holiday events — red, non-interactive feel
    const holidayEvents = holidays.map((h) => ({
      id: `holiday-${h.date}`,
      title: `🇮🇩 ${h.localName || h.name}`,
      start: h.date,
      end: h.date,
      allDay: true,
      backgroundColor: "#fee2e2",
      borderColor: "#fca5a5",
      textColor: "#dc2626",
      extendedProps: { type: "holiday", holiday: h },
      display: "block",
    }));

    return [...holidayEvents, ...taskEvents];
  }, [filtered, users, holidays, isMobile]);

  // ── Day cell background tint for holidays ───────────────────────────────────
  const holidayDates = useMemo(
    () => new Set(holidays.map((h) => h.date)),
    [holidays],
  );

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 pb-10">
      {/* Calendar Wrap (Glassmorphism) */}
      <div className="bg-background/90 backdrop-blur-sm border border-border rounded-xl p-2 sm:p-4 shadow-sm calendar-wrap">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          events={calendarEvents}
          locale={lang === "id" ? "id" : "en"}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          buttonText={
            lang === "id"
              ? { today: "Hari Ini", month: "Bulan", week: "Minggu" }
              : undefined
          }
          eventClick={(info) => {
            const { type, task, holiday } = info.event.extendedProps;
            if (type === "holiday") {
              setSelectedHoliday(holiday);
            } else {
              setSelectedTask(task);
            }
          }}
          height="auto"
          dayMaxEvents={isMobile ? 3 : 4}
          moreLinkClick="popover"
          dayCellClassNames={(arg) => {
            const day = arg.date.getDay();
            const dateStr = [
              arg.date.getFullYear(),
              String(arg.date.getMonth() + 1).padStart(2, "0"),
              String(arg.date.getDate()).padStart(2, "0"),
            ].join("-");
            const classes = [];
            if (day === 0 || day === 6) classes.push("fc-weekend-cell");
            if (holidayDates.has(dateStr)) classes.push("fc-holiday-cell");
            return classes;
          }}
          eventContent={(arg) => {
            const isHoliday = arg.event.extendedProps.type === "holiday";
            if (isHoliday) {
              return (
                <div className="px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium truncate italic leading-relaxed">
                  {arg.event.title}
                </div>
              );
            }

            const { task, assigneeIds, isComday, isWeekend } = arg.event.extendedProps;

            return (
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-1 sm:px-1.5 py-0.5 text-[10.5px] sm:text-xs font-semibold sm:font-medium truncate leading-relaxed ${!isMobile ? "text-white" : ""}`}
              >
                {/* Mobile logic: Colored dots for assignees */}
                {isMobile && assigneeIds?.length > 0 && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    {assigneeIds.slice(0, 3).map(uid => {
                      const u = users.find(x => x.id === uid);
                      const color = u?.color || "#94a3b8";
                      return (
                        <div
                          key={uid}
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.2)]"
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                )}
                {/* Desktop logic uses original title text color since we inject color into background directly */}
                <span className="truncate">{arg.event.title}</span>
              </div>
            );
          }}
        />
      </div>

      {/* Bottom Controls (Legend + Filters) - Minimalist Pill Style */}
      <div className="bg-background/90 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-4 shadow-sm">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest flex-shrink-0">
            {lang === "id" ? "Filter Tim:" : "Team Filter:"}
          </span>
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setFilterUserId("")}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-[13px] font-medium transition-colors border ${filterUserId === ""
                ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200"
                : "bg-background text-muted-foreground border-border hover:border-zinc-300"
                }`}
            >
              {lang === "id" ? "Semua" : "All"}
            </button>

            {users.map((u) => {
              const isActive = filterUserId === u.id;
              const color = u.color || "#64748b";
              return (
                <button
                  key={u.id}
                  onClick={() => setFilterUserId(isActive ? "" : u.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-[13px] font-medium transition-all ${!isActive ? "border border-border text-muted-foreground hover:bg-muted" : "border"}`}
                  style={
                    isActive
                      ? {
                        backgroundColor: `${color}15`, // Translucent background
                        color: color,
                        borderColor: `${color}40`,
                      }
                      : {} // Rely on tailwind classes below for inactive state
                  }
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {u.full_name || u.email?.split("@")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-border/60 w-full">
          <div className="flex items-center justify-between sm:justify-start sm:gap-6 gap-2 w-full">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none justify-center sm:justify-start">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-[8.5px] sm:text-[11px] font-semibold sm:font-medium text-muted-foreground/80 uppercase tracking-widest sm:tracking-widest truncate">
                {lang === "id" ? "Nasional" : "Holiday"}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none justify-center sm:justify-start">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
              <span className="text-[8.5px] sm:text-[11px] font-semibold sm:font-medium text-muted-foreground/80 uppercase tracking-widest sm:tracking-widest truncate">
                {lang === "id" ? "Pengganti" : "Replacement"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          users={users}
          lang={lang}
          onClose={() => setSelectedTask(null)}
          onEdit={onEdit}
          onDelete={onDelete}
          currentUserId={currentUserId}
        />
      )}

      {/* Holiday detail modal */}
      {selectedHoliday && (
        <HolidayModal
          holiday={selectedHoliday}
          lang={lang}
          onClose={() => setSelectedHoliday(null)}
        />
      )}
    </div>
  );
}
