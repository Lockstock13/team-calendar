"use client";

import { format } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { Clock, Check, Pencil, Trash2 } from "lucide-react";
import { useGlobalContext } from "@/app/providers";

function Avatar({ user }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-background flex-shrink-0"
      style={{ backgroundColor: user?.color || "#64748b" }}
      title={user?.full_name || user?.email}
    >
      {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

const getStatusData = (lang) => ({
  todo: { label: lang === "id" ? "Belum Mulai" : "Not Started", cls: "text-slate-500 bg-slate-100" },
  in_progress: { label: lang === "id" ? "On Going" : "In Progress", cls: "text-blue-600 bg-blue-50" },
  done: { label: lang === "id" ? "Selesai" : "Done", cls: "text-green-600 bg-green-50" },
});

function nextStatus(current) {
  if (current === "todo") return "in_progress";
  if (current === "in_progress") return "done";
  return "todo";
}

export default function ListView({
  tasks,
  users,
  onEdit,
  onDelete,
  onUpdateStatus,
  filterUserId,
}) {
  const { language } = useGlobalContext();
  const lang = language || "en";
  const STATUS = getStatusData(lang);
  const getUserById = (uid) => users.find((u) => u.id === uid);

  const filtered = filterUserId
    ? tasks.filter((t) => (t.assignee_ids || []).includes(filterUserId))
    : tasks;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-background border rounded-2xl">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{lang === "id" ? "Belum ada jadwal" : "No tasks yet"}</p>
      </div>
    );
  }

  // Group by date
  const grouped = filtered.reduce((acc, task) => {
    const d = task.start_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dateTasks]) => {
          const dateObj = new Date(date + "T00:00:00");
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const isToday = date === todayStr;

          return (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  )}
                  <h3
                    className={`text-sm font-semibold ${isToday ? "text-orange-500" : "text-muted-foreground"}`}
                  >
                    {format(dateObj, "EEEE, d MMMM yyyy", { locale: lang === "id" ? id : enUS })}
                    {isToday && (
                      <span className="ml-2 text-xs font-medium">
                        — {lang === "id" ? "Hari Ini" : "Today"}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {dateTasks.length} {lang === "id" ? "jadwal" : "tasks"}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-2">
                {dateTasks.map((task) => {
                  const assignees = (task.assignee_ids || [])
                    .map(getUserById)
                    .filter(Boolean);

                  const status = STATUS[task.status] || STATUS.todo;

                  const barColor =
                    task.is_comday || task.task_type === "libur_pengganti"
                      ? "#10b981"
                      : task.is_weekend_task
                        ? "#a855f7"
                        : assignees[0]?.color || "#64748b";

                  return (
                    <div
                      key={task.id}
                      className="bg-background border rounded-xl p-4 flex items-start gap-3 hover:border-primary/30 transition-colors group"
                    >
                      {/* Color bar */}
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: barColor }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {task.title}
                          </span>

                          {(task.is_comday ||
                            task.task_type === "libur_pengganti") && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                🏖️ {lang === "id" ? "Libur Pengganti" : "Replacement Leave"}
                              </span>
                            )}

                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {task.description}
                          </p>
                        )}

                        {/* Assignees */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex -space-x-1">
                            {assignees.slice(0, 4).map((u) => (
                              <Avatar key={u.id} user={u} />
                            ))}
                            {assignees.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
                                +{assignees.length - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {task.assigned_to_name || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            onUpdateStatus(task.id, nextStatus(task.status))
                          }
                          className={`p-1.5 rounded-lg transition-colors ${task.status === "done"
                              ? "text-green-600 bg-green-50 hover:bg-green-100"
                              : "text-muted-foreground hover:bg-muted"
                            }`}
                          title="Update status"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(task)}
                          className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(task.id)}
                          className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                          title={lang === "id" ? "Hapus" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
