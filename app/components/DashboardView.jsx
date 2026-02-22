"use client";

import { useMemo } from "react";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";
import { Sun, Calendar, Clock, Moon, Coffee } from "lucide-react";

function Avatar({ user, size = "sm" }) {
  const cls = size === "lg" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-background flex-shrink-0`}
      style={{ backgroundColor: user?.color || "#64748b" }}
      title={user?.full_name || user?.email}
    >
      {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function TypeBadge({ task }) {
  if (task.is_comday || task.task_type === "libur_pengganti") {
    return (
      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
        🏖️ Libur Pengganti
      </span>
    );
  }
  if (task.is_weekend_task) {
    return (
      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
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
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
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

export default function DashboardView({ tasks, users }) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = format(startOfWeek, "yyyy-MM-dd");
  const monthStart = format(startOfMonth, "yyyy-MM-dd");

  const todayTasks = tasks.filter((t) => t.start_date === todayStr);
  const tomorrowTasks = tasks.filter((t) => t.start_date === tomorrowStr);
  const weekTasks = tasks.filter((t) => t.start_date >= weekStart);
  const monthTasks = tasks.filter((t) => t.start_date >= monthStart);

  const stats = [
    {
      label: "Hari Ini",
      value: todayTasks.length,
      icon: Sun,
      iconColor: "text-orange-500",
      bg: "bg-orange-50",
      dot: "bg-orange-400",
    },
    {
      label: "Minggu Ini",
      value: weekTasks.length,
      icon: Calendar,
      iconColor: "text-blue-500",
      bg: "bg-blue-50",
      dot: "bg-blue-400",
    },
    {
      label: "Bulan Ini",
      value: monthTasks.length,
      icon: Clock,
      iconColor: "text-indigo-500",
      bg: "bg-indigo-50",
      dot: "bg-indigo-400",
    },
    {
      label: "Libur Pengganti",
      value: monthTasks.filter(
        (t) => t.is_comday || t.task_type === "libur_pengganti",
      ).length,
      icon: Moon,
      iconColor: "text-emerald-500",
      bg: "bg-emerald-50",
      dot: "bg-emerald-400",
    },
  ];

  // Workload per user bulan ini
  const userWorkload = users
    .map((u) => ({
      user: u,
      count: monthTasks.filter((t) => (t.assignee_ids || []).includes(u.id))
        .length,
    }))
    .filter((w) => w.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCount = userWorkload[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, iconColor, bg, dot }) => (
          <div
            key={label}
            className="bg-background border rounded-2xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${bg} p-2.5 rounded-xl`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <span className="text-4xl font-bold tabular-nums leading-none">
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

        {/* Workload */}
        <div className="bg-background border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Beban Kerja Bulan Ini</h2>
          {userWorkload.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="text-sm">Belum ada data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userWorkload.map(({ user, count }, i) => (
                <div key={user.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <Avatar user={user} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">
                        {user.full_name || user.email}
                      </span>
                      <span className="text-xs font-bold tabular-nums ml-2">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          backgroundColor: user.color || "#64748b",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
