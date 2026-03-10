"use client";

import { format } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { Clock, Check, Pencil, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import Avatar from "@/app/components/Avatar";
import { useState, useRef } from "react";
import TaskDetailModal from "@/app/components/TaskDetailModal";

// ── Swipeable Card wrapper ──────────────────────────────────────────────────
function SwipeableCard({ children, onSwipeLeft, onSwipeRight }) {
  const startX = useRef(null);
  const [swipeDir, setSwipeDir] = useState(null); // 'left' | 'right' | null

  const THRESHOLD = 60;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setSwipeDir(null);
  };

  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff > 30) setSwipeDir("right");
    else if (diff < -30) setSwipeDir("left");
    else setSwipeDir(null);
  };

  const handleTouchEnd = (e) => {
    if (startX.current === null) return;
    const diff = e.changedTouches[0].clientX - startX.current;
    if (diff > THRESHOLD && onSwipeRight) onSwipeRight();
    else if (diff < -THRESHOLD && onSwipeLeft) onSwipeLeft();
    startX.current = null;
    setSwipeDir(null);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe right hint — toggle status */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 rounded-l-2xl transition-all duration-150 ${swipeDir === "right"
          ? "w-20 bg-blue-500 opacity-100"
          : "w-0 opacity-0"
          }`}
      >
        <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
      </div>

      {/* Swipe left hint — delete */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end px-4 rounded-r-2xl transition-all duration-150 ${swipeDir === "left"
          ? "w-20 bg-red-500 opacity-100"
          : "w-0 opacity-0"
          }`}
      >
        <ChevronLeft className="w-5 h-5 text-white flex-shrink-0" />
      </div>

      {/* Card content with slight translate on swipe */}
      <div
        className={`relative z-10 transition-transform duration-150 ${swipeDir === "right" ? "translate-x-2" :
          swipeDir === "left" ? "-translate-x-2" : ""
          }`}
      >
        {children}
      </div>
    </div>
  );
}

const getStatusData = (lang) => ({
  todo: {
    label: lang === "id" ? "Belum Mulai" : "Not Started",
    cls: "text-slate-500 bg-slate-100",
  },
  in_progress: {
    label: lang === "id" ? "On Going" : "In Progress",
    cls: "text-blue-600 bg-blue-50",
  },
  done: {
    label: lang === "id" ? "Selesai" : "Done",
    cls: "text-green-600 bg-green-50",
  },
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
  currentUserId,
}) {
  const { language } = useGlobalContext();
  const lang = language || "en";
  const STATUS = getStatusData(lang);
  const getUserById = (uid) => users.find((u) => u.id === uid);
  const [selectedTask, setSelectedTask] = useState(null);

  const filtered = filterUserId
    ? tasks.filter((t) => (t.assignee_ids || []).includes(filterUserId))
    : tasks;

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-background border rounded-2xl">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">
          {lang === "id" ? "Belum ada jadwal" : "No tasks yet"}
        </p>
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
    <>
      <div className="space-y-6">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, dateTasks]) => {
            const dateObj = new Date(date + "T00:00:00");
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const isToday = date === todayStr;

            return (
              <div key={date}>
                {/* Date header — sticky */}
                <div className="sticky top-14 z-20 -mx-1 px-1 py-1.5 mb-1 bg-background/80 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isToday && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 animate-pulse" />
                      )}
                      <h3
                        className={`text-sm font-semibold ${isToday ? "text-orange-500" : "text-muted-foreground"}`}
                      >
                        {format(dateObj, "EEEE, d MMMM yyyy", {
                          locale: lang === "id" ? id : enUS,
                        })}
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
                </div>

                {/* Task cards */}
                <div className="space-y-2">
                  {dateTasks.map((task) => {
                    const assignees = (task.assignee_ids || [])
                      .map(getUserById)
                      .filter(Boolean);

                    const status = STATUS[task.status] || STATUS.todo;

                    const isComday = task.is_comday || task.task_type === "libur_pengganti";
                    const barColor = isComday
                      ? "#f472b6"
                      : task.is_weekend_task
                        ? "#a855f7"
                        : assignees[0]?.color || "#64748b";

                    return (
                      <SwipeableCard
                        key={task.id}
                        onSwipeLeft={() => onDelete(task)}
                        onSwipeRight={() => onUpdateStatus(task.id, nextStatus(task.status))}
                      >
                        <div
                          className="bg-background border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all group"
                        >
                          {/* Card body */}
                          <div
                            className="flex items-start gap-3 p-4 pb-3 cursor-pointer"
                            onClick={() => setSelectedTask(task)}
                          >
                            {/* Color bar */}
                            <div
                              className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[40px]"
                              style={{ backgroundColor: barColor }}
                            />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold text-sm leading-snug ${task.status === "done" ? "line-through text-muted-foreground/60" : ""}`}>
                                  {task.title}
                                </span>

                                {isComday && (
                                  <span className="text-xs bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400 px-2 py-0.5 rounded-full font-medium border border-pink-100 dark:border-pink-900/50">
                                    🏖️{" "}
                                    {lang === "id" ? "Libur Pengganti" : "Replacement Leave"}
                                  </span>
                                )}

                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
                                  {status.label}
                                </span>
                              </div>

                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
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
                          </div>

                          {/* Action footer — full width, easy tap on mobile */}
                          <div className="flex border-t border-border/60 divide-x divide-border/60">
                            <button
                              onClick={() => onUpdateStatus(task.id, nextStatus(task.status))}
                              aria-label={
                                task.status === "done"
                                  ? (lang === "id" ? "Tandai selesai" : "Mark done")
                                  : task.status === "in_progress"
                                    ? (lang === "id" ? "Lanjutkan status" : "Advance status")
                                    : (lang === "id" ? "Mulai tugas" : "Start task")
                              }
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors active:scale-95 ${task.status === "done"
                                ? "text-green-600 bg-green-50/60 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                                : "text-muted-foreground hover:bg-muted/60"
                                }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span className="truncate">
                                {task.status === "done"
                                  ? (lang === "id" ? "Selesai" : "Done")
                                  : task.status === "in_progress"
                                    ? (lang === "id" ? "Lanjut" : "Next")
                                    : (lang === "id" ? "Mulai" : "Start")}
                              </span>
                            </button>
                            <button
                              onClick={() => onEdit(task)}
                              aria-label={lang === "id" ? "Edit jadwal" : "Edit task"}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="truncate">Edit</span>
                            </button>
                            <button
                              onClick={() => onDelete(task)}
                              aria-label={lang === "id" ? "Hapus jadwal" : "Delete task"}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="truncate">{lang === "id" ? "Hapus" : "Delete"}</span>
                            </button>
                          </div>
                        </div>
                      </SwipeableCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {
        selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            users={users}
            lang={lang}
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={() => setSelectedTask(null)}
            currentUserId={currentUserId}
          />
        )
      }
    </>
  );
}
