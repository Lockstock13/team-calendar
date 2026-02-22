"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { X } from "lucide-react";

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

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl border shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div
          className="h-2 rounded-t-2xl"
          style={{
            backgroundColor:
              task.is_comday || task.task_type === "libur_pengganti"
                ? "#10b981"
                : task.is_weekend_task
                  ? "#a855f7"
                  : assignees[0]?.color || "#64748b",
          }}
        />

        <div className="p-5 space-y-4">
          {/* Title + badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(task.is_comday || task.task_type === "libur_pengganti") && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    🏖️ Libur Pengganti
                  </span>
                )}
                {task.is_weekend_task && !task.is_comday && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
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
                  ` – ${format(new Date(task.end_date + "T00:00:00"), "d MMMM yyyy", { locale: id })}`}
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
                {assignees.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: u.color || "#64748b" }}
                    >
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{u.full_name || u.email}</span>
                  </div>
                ))}
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
              className="flex-1 py-2 text-sm font-medium bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarView({ tasks, users, onEdit, onDelete }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterUserId, setFilterUserId] = useState("");

  const filtered = useMemo(
    () =>
      filterUserId
        ? tasks.filter((t) => (t.assignee_ids || []).includes(filterUserId))
        : tasks,
    [tasks, filterUserId],
  );

  const calendarEvents = useMemo(
    () =>
      filtered.map((task) => {
        const assigneeIds = task.assignee_ids || [];
        const firstAssignee = users.find((u) => u.id === assigneeIds[0]);

        // Selalu pakai warna akun fotografer pertama
        const color = firstAssignee?.color || "#64748b";

        // Tampilkan semua nama assignee
        const allNames = task.assigned_to_name || "";

        // Badge tipe di depan judul (hapus weekend)
        const prefix =
          task.is_comday || task.task_type === "libur_pengganti" ? "🏖️ " : "";

        let title = prefix + task.title;
        if (allNames) title += ` · ${allNames}`;

        // FullCalendar end date is EXCLUSIVE
        // Fix: pakai local timezone, JANGAN toISOString() karena convert ke UTC
        // dan bisa mundur 1 hari untuk user di UTC+7 dst
        const rawEnd =
          task.end_date && task.end_date >= task.start_date
            ? task.end_date
            : task.start_date;
        const [ey, em, ed] = rawEnd.split("-").map(Number);
        const next = new Date(ey, em - 1, ed + 1); // local time, aman dari timezone
        const endStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;

        return {
          id: task.id,
          title,
          start: task.start_date,
          end: endStr,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: "#fff",
          extendedProps: task,
        };
      }),
    [filtered, users],
  );

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">
          Filter:
        </span>
        <button
          onClick={() => setFilterUserId("")}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            filterUserId === ""
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium transition-all"
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

      {/* Calendar */}
      <div className="bg-background border rounded-2xl p-4 calendar-wrap">
        <FullCalendar
          key={calendarEvents.map((e) => e.id + e.start + e.end).join(",")}
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
            const task = tasks.find((t) => t.id === info.event.id);
            if (task) setSelectedTask(task);
          }}
          height="auto"
          dayCellClassNames={(arg) => {
            const day = arg.date.getDay();
            return day === 0 || day === 6 ? "fc-weekend-cell" : "";
          }}
          eventContent={(arg) => (
            <div className="px-1.5 py-0.5 text-xs font-medium truncate leading-relaxed">
              {arg.event.title}
            </div>
          )}
        />
      </div>

      {/* Event detail modal */}
      {selectedTask && (
        <EventDetailModal
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
