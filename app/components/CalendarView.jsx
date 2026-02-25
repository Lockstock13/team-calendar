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

// ─── Event Detail Modal ────────────────────────────────────────────────────────

function EventDetailModal({ task, users, onClose, onEdit, onDelete, lang }) {
  if (!task) return null;

  const assignees = (task.assignee_ids || [])
    .map((uid) => users.find((u) => u.id === uid))
    .filter(Boolean);

  const statusLabel = {
    todo: lang === "id" ? "Belum Mulai" : "Not Started",
    in_progress: lang === "id" ? "Sedang Berjalan" : "In Progress",
    done: lang === "id" ? "Selesai" : "Done",
  };

  const priorityLabel = {
    low: lang === "id" ? "🟢 Rendah" : "🟢 Low",
    medium: lang === "id" ? "🟡 Sedang" : "🟡 Medium",
    high: lang === "id" ? "🔴 Tinggi" : "🔴 High",
  };

  const accentColor =
    task.is_comday || task.task_type === "libur_pengganti"
      ? "#10b981"
      : task.is_weekend_task
        ? "#a855f7"
        : assignees[0]?.color || "#64748b";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colour stripe */}
        <div className="h-1.5" style={{ backgroundColor: accentColor }} />

        <div className="p-6">
          {/* Title + badges */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {(task.is_comday || task.task_type === "libur_pengganti") && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-sm font-medium border border-emerald-100/50">
                    🏖️ {lang === "id" ? "Libur Pengganti" : "Replacement Leave"}
                  </span>
                )}
                {task.is_weekend_task && !task.is_comday && (
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-sm font-medium border border-purple-100/50">
                    🌙 Weekend
                  </span>
                )}
                {task.priority && (
                  <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-sm font-medium border border-border">
                    {priorityLabel[task.priority] || task.priority}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground leading-tight">
                {task.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground/80 hover:bg-zinc-100 hover:text-zinc-600 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detail rows */}
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                {lang === "id" ? "Tanggal" : "Date"}
              </p>
              <span className="text-[14px] font-medium text-foreground">
                {format(
                  new Date(task.start_date + "T00:00:00"),
                  "EEEE, d MMMM yyyy",
                  { locale: lang === "id" ? id : enUS },
                )}
                {task.end_date &&
                  task.end_date !== task.start_date &&
                  ` – ${format(
                    new Date(task.end_date + "T00:00:00"),
                    "EEEE, d MMMM yyyy",
                    { locale: lang === "id" ? id : enUS },
                  )}`}
              </span>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                Status
              </p>
              <span className="text-[14px] font-medium text-foreground">
                {statusLabel[task.status] || task.status}
              </span>
            </div>

            {task.description && (
              <div className="pt-1">
                <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                  {lang === "id" ? "Catatan" : "Notes"}
                </p>
                <div className="bg-zinc-50 p-3 rounded-lg border border-border">
                  <p className="text-[13px] text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                {lang === "id" ? "Tim Penugasan" : "Assigned Team"}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {assignees.length > 0 ? (
                  assignees.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 bg-background border border-border pl-1 pr-3 py-1 rounded-full shadow-sm"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium"
                        style={{ backgroundColor: u.color || "#64748b" }}
                      >
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-medium text-foreground/90">
                        {u.full_name || u.email.split("@")[0]}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground/80 italic">
                    {task.assigned_to_name || "—"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 pt-4 border-t border-border flex gap-2 justify-end">
            <button
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="px-4 py-2 bg-background border border-red-100 text-red-600 rounded-xl hover:bg-red-50 text-sm font-semibold transition-colors active:scale-95"
            >
              {lang === "id" ? "Hapus" : "Delete"}
            </button>
            <button
              onClick={() => {
                onEdit(task);
                onClose();
              }}
              className="px-5 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 text-sm font-semibold transition-colors shadow-sm active:scale-95"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Holiday Detail Modal ──────────────────────────────────────────────────────

function HolidayModal({ holiday, onClose, lang }) {
  if (!holiday) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
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
              className="px-5 py-2 bg-background border hover:bg-zinc-50 border-border text-foreground/90 rounded-xl text-sm font-semibold transition-colors active:scale-95 shadow-sm"
            >
              {lang === "id" ? "Tutup" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fetch Indonesian public holidays from Nager.Date ─────────────────────────

async function fetchHolidays(year) {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ─── Main CalendarView ─────────────────────────────────────────────────────────

export default function CalendarView({ tasks, users, onEdit, onDelete }) {
  const { language } = useGlobalContext();
  const { addToast } = useToast();
  const lang = language || "en";
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [holidays, setHolidays] = useState([]);

  // ── Fetch holidays for current year (+ next year) ──────────────────────────
  useEffect(() => {
    const year = new Date().getFullYear();
    const months = new Date().getMonth(); // 0-based
    const years = months >= 10 ? [year, year + 1] : [year];

    Promise.all(years.map(fetchHolidays)).then((results) => {
      setHolidays(results.flat());
    });
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

      const prefix =
        task.is_comday || task.task_type === "libur_pengganti" ? "🏖️ " : "";

      if (assigneeIds.length === 0) {
        // No assignees — show once with neutral colour
        return [
          {
            id: task.id,
            title: prefix + task.title,
            start: task.start_date,
            end: endStr,
            allDay: true,
            backgroundColor: "#64748b",
            borderColor: "#64748b",
            textColor: "#fff",
            extendedProps: { type: "task", task },
          },
        ];
      }

      // One event per assignee
      return assigneeIds.map((uid) => {
        const user = users.find((u) => u.id === uid);
        const color =
          task.is_comday || task.task_type === "libur_pengganti"
            ? "#10b981"
            : user?.color || "#64748b";
        const name = user?.full_name || user?.email?.split("@")[0] || "?";

        return {
          id: `${task.id}-${uid}`,
          title: `${prefix}${task.title} · ${name}`,
          start: task.start_date,
          end: endStr,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: "#fff",
          extendedProps: { type: "task", task },
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
  }, [filtered, users, holidays]);

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
            return (
              <div
                className={`px-1.5 py-0.5 text-xs font-medium truncate leading-relaxed ${isHoliday ? "italic" : ""
                  }`}
              >
                {arg.event.title}
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
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[8.5px] sm:text-[11px] font-semibold sm:font-medium text-muted-foreground/80 uppercase tracking-widest sm:tracking-widest truncate">
                {lang === "id" ? "Pengganti" : "Replacement"}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none justify-center sm:justify-start">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
              <span className="text-[8.5px] sm:text-[11px] font-semibold sm:font-medium text-muted-foreground/80 uppercase tracking-widest sm:tracking-widest truncate">
                {lang === "id" ? "1 blok=1 tim" : "1 dot=1 team"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <EventDetailModal
          task={selectedTask}
          users={users}
          lang={lang}
          onClose={() => setSelectedTask(null)}
          onEdit={onEdit}
          onDelete={onDelete}
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
