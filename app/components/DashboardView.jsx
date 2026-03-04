"use client";

import { useMemo } from "react";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";
import { Sun, Clock, Coffee, CalendarDays } from "lucide-react";
import Avatar from "./Avatar";


function TypeBadge({ task }) {
  if (task.is_comday || task.task_type === "libur_pengganti") {
    return (
      <span className="text-xs bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        🏖️ Libur
      </span>
    );
  }
  if (task.is_weekend_task) {
    return (
      <span className="text-xs bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        🌙 Weekend
      </span>
    );
  }
  return null;
}

function TaskRow({ task, users }) {
  const assignees = (task.assignee_ids || [])
    .map((uid) => users.find((u) => u.id === uid))
    .filter(Boolean);

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-muted/30 active:scale-[0.98] active:bg-muted/50 transition-all rounded-sm cursor-pointer -mx-2 px-2">
      <div className="flex -space-x-2 flex-shrink-0">
        {assignees.slice(0, 3).map((u) => (
          <Avatar key={u.id} user={u} />
        ))}
        {assignees.length > 3 && (
          <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
            +{assignees.length - 3}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {task.assigned_to_name || "—"}
        </p>
      </div>
      <TypeBadge task={task} />
    </div>
  );
}

// ─── My Schedule task row ──────────────────────────────────────────────────────

function MyTaskRow({ task }) {
  const dateStr = task.start_date
    ? format(new Date(task.start_date + "T00:00:00"), "d MMM", { locale: id })
    : "-";
  const endStr =
    task.end_date && task.end_date !== task.start_date
      ? format(new Date(task.end_date + "T00:00:00"), "d MMM", { locale: id })
      : null;

  const isLibur = task.is_comday || task.task_type === "libur_pengganti";
  const barColor = isLibur
    ? "#10b981"
    : task.is_weekend_task
      ? "#a855f7"
      : "#3b82f6";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0 hover:bg-muted/30 active:scale-[0.98] active:bg-muted/50 transition-all rounded-sm cursor-pointer -mx-2 px-2">
      {/* Color dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: barColor }}
      />
      {/* Date */}
      <div className="w-14 flex-shrink-0 text-right">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {dateStr}
        </span>
        {endStr && (
          <span className="block text-xs text-muted-foreground/70 tabular-nums">
            – {endStr}
          </span>
        )}
      </div>
      {/* Title */}
      <span className="flex-1 text-sm font-medium truncate">{task.title}</span>
      {/* Badge */}
      {isLibur && (
        <span className="text-xs bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
          🏖️ Libur
        </span>
      )}
    </div>
  );
}

// ─── My Schedule Panel ─────────────────────────────────────────────────────────

function MySchedulePanel({ tasks, users, currentUserId }) {
  const now = new Date();
  const monthStart = format(
    new Date(now.getFullYear(), now.getMonth(), 1),
    "yyyy-MM-dd",
  );
  const monthEnd = format(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
    "yyyy-MM-dd",
  );

  const currentUser = users.find((u) => u.id === currentUserId);

  // All tasks in this month (entire team) — used as denominator for progress bar
  const allMonthTasksCount = useMemo(
    () =>
      tasks.filter((t) => t.start_date >= monthStart && t.start_date <= monthEnd)
        .length,
    [tasks, monthStart, monthEnd],
  );

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

  const regular = myTasks.filter(
    (t) => !t.is_comday && t.task_type !== "libur_pengganti",
  );
  const libur = myTasks.filter(
    (t) => t.is_comday || t.task_type === "libur_pengganti",
  );

  const monthLabel = format(now, "MMMM yyyy", { locale: id });
  const color = currentUser?.color || "#64748b";

  return (
    <div className="bg-background border rounded-2xl overflow-hidden">
      {/* Header strip */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            My Schedule
          </h2>
          <span className="text-xs text-muted-foreground capitalize">
            {monthLabel}
          </span>
        </div>

        {/* User info + summary */}
        <div className="flex items-center gap-3">
          {currentUser && <Avatar user={currentUser} size="lg" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {currentUser?.full_name || currentUser?.email || "Kamu"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {regular.length} tugas
              </span>
              {libur.length > 0 && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                    {libur.length} libur pengganti
                  </span>
                </>
              )}
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs font-bold tabular-nums">
                {myTasks.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar — % of month's team total that belongs to me */}
        {myTasks.length > 0 && (
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  (myTasks.length / Math.max(allMonthTasksCount, 1)) * 100,
                  100,
                )}%`,
                backgroundColor: color,
              }}
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="border-t px-5">
        {myTasks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl my-4 bg-muted/20">
            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center border shadow-sm mb-3">
              <CalendarDays className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">Kosong</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              Belum ada jadwal untukmu bulan ini
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {myTasks.map((t) => (
              <MyTaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardView({ tasks, users, currentUserId }) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = format(startOfMonth, "yyyy-MM-dd");

  const todayTasks = tasks.filter((t) => t.start_date === todayStr);
  const tomorrowTasks = tasks.filter((t) => t.start_date === tomorrowStr);
  const monthTasks = tasks.filter((t) => t.start_date >= monthStart);

  const stats = [
    {
      label: "Hari Ini",
      value: todayTasks.length,
      icon: Sun,
      iconColor: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-500/15",
      dot: "bg-orange-400",
    },
    {
      label: "Bulan Ini",
      value: monthTasks.length,
      icon: Clock,
      iconColor: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-500/15",
      dot: "bg-indigo-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards — 2 cards only */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, iconColor, bg, dot }) => (
          <div
            key={label}
            className="bg-background border rounded-2xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${bg} p-2.5 rounded-xl`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <span className="text-2xl sm:text-4xl font-bold tabular-nums leading-none">
                {value}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <p className="text-xs text-muted-foreground font-medium">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Jadwal today + tomorrow */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today */}
          <div className="bg-background border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                Jadwal Hari Ini
              </h2>
              <span className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, d MMMM", { locale: id })}
              </span>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Coffee className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tidak ada jadwal hari ini</p>
              </div>
            ) : (
              <div>
                {todayTasks.map((t) => (
                  <TaskRow key={t.id} task={t} users={users} />
                ))}
              </div>
            )}
          </div>

          {/* Tomorrow */}
          {tomorrowTasks.length > 0 && (
            <div className="bg-background border rounded-2xl p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Besok
              </h2>
              <div>
                {tomorrowTasks.map((t) => (
                  <TaskRow key={t.id} task={t} users={users} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Schedule */}
        <MySchedulePanel
          tasks={tasks}
          users={users}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
