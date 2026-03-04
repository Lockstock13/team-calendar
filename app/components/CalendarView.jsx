"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { X } from "lucide-react";
import { useSwipeGesture } from "@/app/hooks/useSwipeGesture";

// ─── Event Detail Modal ────────────────────────────────────────────────────────

function EventDetailModal({ task, users, onClose, onEdit, onDelete }) {
  if (!task) return null;

  const assignees = (task.assignee_ids || [])
    .map((uid) => users.find((u) => u.id === uid))
    .filter(Boolean);

  const statusLabel = {
    todo: "Belum Mulai",
    in_progress: "Sedang Berjalan",
    done: "Selesai",
  };

  const priorityLabel = {
    low: "🟢 Rendah",
    medium: "🟡 Sedang",
    high: "🔴 Tinggi",
  };

  const accentColor =
    task.is_comday || task.task_type === "libur_pengganti"
      ? "#10b981"
      : task.is_weekend_task
        ? "#a855f7"
        : assignees[0]?.color || "#64748b";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl border shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colour stripe */}
        <div
          className="h-2 rounded-t-2xl"
          style={{ backgroundColor: accentColor }}
        />

        <div className="p-5 space-y-4">
          {/* Title + badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(task.is_comday || task.task_type === "libur_pengganti") && (
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    🏖️ Libur Pengganti
                  </span>
                )}
                {task.is_weekend_task && !task.is_comday && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                    🌙 Weekend
                  </span>
                )}
                {task.priority && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {priorityLabel[task.priority] || task.priority}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-base leading-snug">
                {task.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detail rows */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-muted-foreground w-16 flex-shrink-0">
                Tanggal
              </span>
              <span className="font-medium">
                {format(
                  new Date(task.start_date + "T00:00:00"),
                  "d MMMM yyyy",
                  { locale: id },
                )}
                {task.end_date &&
                  task.end_date !== task.start_date &&
                  ` – ${format(
                    new Date(task.end_date + "T00:00:00"),
                    "d MMMM yyyy",
                    { locale: id },
                  )}`}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-muted-foreground w-16 flex-shrink-0">
                Status
              </span>
              <span>{statusLabel[task.status] || task.status}</span>
            </div>

            {task.description && (
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground w-16 flex-shrink-0">
                  Catatan
                </span>
                <span className="leading-relaxed">{task.description}</span>
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="text-muted-foreground w-16 flex-shrink-0 pt-1">
                Tim
              </span>
              <div className="flex flex-wrap gap-2">
                {assignees.length > 0 ? (
                  assignees.map((u) => (
                    <div key={u.id} className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: u.color || "#64748b" }}
                      >
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{u.full_name || u.email}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {task.assigned_to_name || "—"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <button
              onClick={() => {
                onEdit(task);
                onClose();
              }}
              className="flex-1 py-2 text-sm font-medium border rounded-xl hover:bg-muted transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="flex-1 py-2 text-sm font-medium bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-500/25 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Holiday Detail Modal ──────────────────────────────────────────────────────

function HolidayModal({ holiday, onClose }) {
  if (!holiday) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl border shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 rounded-t-2xl bg-red-400" />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                🇮🇩 Libur Nasional
              </span>
              <h3 className="font-semibold text-base mt-2 leading-snug">
                {holiday.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-16">Tanggal</span>
            <span className="font-medium">
              {format(
                new Date(holiday.date + "T00:00:00"),
                "EEEE, d MMMM yyyy",
                {
                  locale: id,
                },
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fetch Indonesian public holidays from libur.deno.dev ─────────────────────
// API source: https://github.com/radyakaze/api-hari-libur

async function fetchHolidays(year) {
  try {
    const res = await fetch(
      `https://libur.deno.dev/api?year=${year}`,
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
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");
  const [holidays, setHolidays] = useState([]);
  const calendarRef = useRef(null);

  // ── Swipe left/right to navigate months on mobile ──────────────────────────
  const handleSwipeLeft = useCallback(() => {
    calendarRef.current?.getApi()?.next();
  }, []);
  const handleSwipeRight = useCallback(() => {
    calendarRef.current?.getApi()?.prev();
  }, []);

  useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 60,
  });

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
      title: `🇮🇩 ${h.name}`,
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
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        <span className="text-sm text-muted-foreground font-medium flex-shrink-0">
          Filter:
        </span>

        <button
          onClick={() => setFilterUserId("")}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${filterUserId === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
        >
          Semua
        </button>

        {users.map((u) => {
          const isActive = filterUserId === u.id;
          const color = u.color || "#64748b";
          return (
            <button
              key={u.id}
              onClick={() => setFilterUserId(isActive ? "" : u.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap"
              style={
                isActive
                  ? {
                    backgroundColor: color,
                    color: "#fff",
                    outline: `2px solid ${color}`,
                    outlineOffset: "2px",
                  }
                  : {
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                  }
              }
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-white/30"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.3)" : color,
                }}
              />
              {u.full_name || u.email?.split("@")[0]}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-500/30 border border-red-300 dark:border-red-700" />
          <span className="text-xs text-muted-foreground">Libur Nasional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          <span className="text-xs text-muted-foreground">Libur Pengganti</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">
            1 blok = 1 anggota tim
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-background border rounded-2xl p-4 calendar-wrap">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          events={calendarEvents}
          locale="id"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          buttonText={{ today: "Hari Ini", month: "Bulan", week: "Minggu" }}
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

      {/* Task detail modal */}
      {selectedTask && (
        <EventDetailModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

      {/* Holiday detail modal */}
      {selectedHoliday && (
        <HolidayModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
        />
      )}
    </>
  );
}
