"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Printer,
  ChevronDown,
  ChevronUp,
  LayoutList,
  BarChart2,
  Download,
} from "lucide-react";
import { useGlobalContext } from "@/app/providers";
import { enUS } from "date-fns/locale";
import Avatar from "@/app/components/Avatar";
import { Camera, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TypeBadge({ task, lang }) {
  if (task.is_comday || task.task_type === "libur_pengganti") {
    return (
      <span className="inline-flex items-center text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
        🏖️ {lang === "id" ? "Libur Pengganti" : "Replacement Leave"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
      📌 {lang === "id" ? "Reguler" : "Regular"}
    </span>
  );
}

function StatusBadge({ status, lang }) {
  const map = {
    todo: {
      label: lang === "id" ? "Belum Mulai" : "Not Started",
      cls: "bg-muted text-muted-foreground",
    },
    in_progress: {
      label: lang === "id" ? "Berjalan" : "In Progress",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    done: {
      label: lang === "id" ? "Selesai" : "Done",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
  };
  const s = map[status] || map.todo;
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function formatDateRange(task, lang) {
  const localeObj = lang === "id" ? id : enUS;
  const start = task.start_date
    ? format(new Date(task.start_date + "T00:00:00"), "d MMM yyyy", {
      locale: localeObj,
    })
    : "-";
  const end =
    task.end_date && task.end_date !== task.start_date
      ? format(new Date(task.end_date + "T00:00:00"), "d MMM yyyy", {
        locale: localeObj,
      })
      : null;
  return end ? `${start} - ${end}` : start;
}

// â”€â”€â”€ Export CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function exportCSV(flattenedTasks, month, year, lang) {
  const MONTHS = lang === "id" ? MONTHS_ID : MONTHS_EN;
  const monthLabel = MONTHS[month];
  const header = [
    "No",
    lang === "id" ? "Tanggal" : "Date",
    lang === "id" ? "Tugas" : "Task",
    lang === "id" ? "Petugas" : "Assignee",
    lang === "id" ? "Tipe" : "Type",
    "Status",
    lang === "id" ? "Kategori Alat" : "Category",
    lang === "id" ? "Nama Alat" : "Equipment Name",
    "S/N",
    lang === "id" ? "Catatan" : "Notes",
  ];

  const rows = flattenedTasks.map((item, i) => {
    const localeObj = lang === "id" ? id : enUS;
    const dateStr = item.start_date
      ? format(new Date(item.start_date + "T00:00:00"), "d MMM yyyy", {
        locale: localeObj,
      })
      : "-";
    const endStr =
      item.end_date && item.end_date !== item.start_date
        ? ` - ${format(new Date(item.end_date + "T00:00:00"), "d MMM yyyy", { locale: localeObj })}`
        : "";
    
    const tipe =
      item.is_comday || item.task_type === "libur_pengganti"
        ? lang === "id"
          ? "Libur Pengganti"
          : "Replacement Leave"
        : "Regular";
    const statusMap = {
      todo: lang === "id" ? "Belum Mulai" : "Not Started",
      in_progress: lang === "id" ? "Berjalan" : "In Progress",
      done: lang === "id" ? "Selesai" : "Done",
    };
    const status = statusMap[item.status] || item.status || "-";
    const catatan = (item.description || "").replace(/"/g, '""');
    
    const eqCat = item.flatEq ? item.flatEq.category_name : "-";
    const eqName = item.flatEq ? item.flatEq.name : "-";
    const eqSN = item.flatEq?.serial_number ? item.flatEq.serial_number : "-";

    return [
      i + 1,
      `"${dateStr}${endStr}"`,
      `"${item.title}"`,
      `"${item.flatUserName}"`,
      `"${tipe}"`,
      `"${status}"`,
      `"${eqCat}"`,
      `"${eqName}"`,
      `"${eqSN}"`,
      `"${catatan}"`,
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${lang === "id" ? "Laporan" : "Report"}_${monthLabel}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tabel Harian ──────────────────────────────────────────────────────────

function DailyTable({ flattenedTasks, lang }) {
  const spansAndMeta = useMemo(() => {
    const meta = new Array(flattenedTasks.length).fill(null).map(() => ({
      taskSpan: 0,
      userSpan: 0,
    }));

    if (flattenedTasks.length === 0) return meta;

    let currentTaskId = null;
    let currentTaskStartIndex = 0;

    let currentUserGroupKey = null; // Combination of task ID + flatUserName
    let currentUserStartIndex = 0;

    for (let i = 0; i <= flattenedTasks.length; i++) {
      const isEnd = i === flattenedTasks.length;
      const item = isEnd ? null : flattenedTasks[i];

      const taskId = item?.id;
      const userKey = item ? `${taskId}-${item.flatUserName}` : null;

      // Handle Task Span
      if (isEnd || taskId !== currentTaskId) {
        if (i > 0 && currentTaskId !== null) {
           meta[currentTaskStartIndex].taskSpan = i - currentTaskStartIndex;
        }
        if (!isEnd) {
           currentTaskId = taskId;
           currentTaskStartIndex = i;
        }
      }

      // Handle User Span
      if (isEnd || userKey !== currentUserGroupKey) {
        if (i > 0 && currentUserGroupKey !== null) {
           meta[currentUserStartIndex].userSpan = i - currentUserStartIndex;
        }
        if (!isEnd) {
           currentUserGroupKey = userKey;
           currentUserStartIndex = i;
        }
      }
    }

    return meta;
  }, [flattenedTasks]);

  if (flattenedTasks.length === 0) return null;

  return (
    <div className="bg-background/95 border rounded-xl overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-8">
                No
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-40">
                {lang === "id" ? "Tanggal" : "Date"}
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "id" ? "Tugas" : "Task"}
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-40">
                {lang === "id" ? "Petugas" : "Assignee"}
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-28">
                {lang === "id" ? "Tipe" : "Type"}
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Status
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-32">
                {lang === "id" ? "Kategori Alat" : "Category"}
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-40">
                {lang === "id" ? "Nama Alat" : "Equipment Name"}
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-28">
                S/N
              </th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[200px]">
                {lang === "id" ? "Catatan" : "Notes"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {flattenedTasks.map((item, i) => {
              const meta = spansAndMeta[i];
              if (!meta) return null;

              // If taskSpan is 0, it means it's a grouped task body row, so we hide the primary task cells
              const showTaskCells = meta.taskSpan > 0;
              // If userSpan is 0, it means it's a grouped user body row, so we hide the user assignment cell
              const showUserCell = meta.userSpan > 0;

              return (
                <tr
                  key={`${item.id}-${i}`}
                  className={`hover:bg-muted/20 transition-colors ${item.is_comday || item.task_type === "libur_pengganti"
                    ? "bg-pink-50/40 dark:bg-pink-950/20"
                    : ""
                    }`}
                >
                  {/* Task Bound Cells */}
                  {showTaskCells && (
                    <>
                      {/* No */}
                      <td className="px-4 py-3 text-muted-foreground tabular-nums align-top" rowSpan={meta.taskSpan}>
                        {flattenedTasks.findIndex(t => t.id === item.id) === i ? 
                          flattenedTasks.filter((t, idx, arr) => arr.findIndex(t2 => t2.id === t.id) === idx).findIndex(t => t.id === item.id) + 1 
                          : ""}
                      </td>
                      {/* Tanggal */}
                      <td className="px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap align-top" rowSpan={meta.taskSpan}>
                        {item.start_date
                          ? format(
                            new Date(item.start_date + "T00:00:00"),
                            "EEE, d MMM yyyy",
                            { locale: lang === "id" ? id : enUS },
                          )
                          : "-"}
                        {item.end_date && item.end_date !== item.start_date && (
                          <span className="block text-xs text-muted-foreground font-normal">
                            {lang === "id" ? "s/d " : "to "}
                            {format(
                              new Date(item.end_date + "T00:00:00"),
                              "d MMM yyyy",
                              { locale: lang === "id" ? id : enUS },
                            )}
                          </span>
                        )}
                      </td>
                      {/* Tugas */}
                      <td className="px-4 py-3 font-semibold align-top" rowSpan={meta.taskSpan}>{item.title}</td>
                    </>
                  )}

                  {/* User Bound Cell */}
                  {showUserCell && (
                    <td className="px-4 py-3 align-top border-l border-r border-border/40" rowSpan={meta.userSpan}>
                      {item.flatUser ? (
                         <div className="flex items-center gap-1.5">
                           <Avatar user={item.flatUser} />
                           <span className="text-xs truncate max-w-[110px]">
                             {item.flatUserName}
                           </span>
                         </div>
                      ) : (
                         <span className="text-xs text-muted-foreground">
                           {item.flatUserName}
                         </span>
                      )}
                    </td>
                  )}

                  {/* Task Bound Cells (Cont'd) */}
                  {showTaskCells && (
                    <>
                      {/* Tipe */}
                      <td className="px-4 py-3 align-top border-r border-border/40" rowSpan={meta.taskSpan}>
                        <TypeBadge task={item} lang={lang} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 align-top border-r border-border/40" rowSpan={meta.taskSpan}>
                        <StatusBadge status={item.status} lang={lang} />
                      </td>
                    </>
                  )}

                  {/* Unique Equipment Cells (Always Rendered) */}
                  {/* Kategori Alat */}
                  <td className="px-4 py-3 align-top">
                    {item.flatEq ? (
                       <span className="bg-primary/10 text-primary dark:text-primary-foreground text-[10px] px-2 py-0.5 rounded border border-primary/20">
                         {item.flatEq.category_name}
                       </span>
                    ) : (
                       <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {/* Nama Alat */}
                  <td className="px-4 py-3 text-xs font-medium align-top">
                    {item.flatEq ? item.flatEq.name : <span className="text-muted-foreground">-</span>}
                  </td>
                  {/* S/N */}
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground align-top">
                    {item.flatEq?.serial_number ? item.flatEq.serial_number : "-"}
                  </td>

                  {/* Task Bound Cells (Cont'd) */}
                  {showTaskCells && (
                    <td className="px-4 py-3 text-xs text-muted-foreground leading-relaxed align-top border-l border-border/40" rowSpan={meta.taskSpan}>
                      <span className="max-w-[180px] block line-clamp-2" title={item.description}>
                        {item.description || (
                          <span className="italic opacity-50">-</span>
                        )}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2 p-3">
        {flattenedTasks.map((item, i) => {
          const isComday = item.is_comday || item.task_type === "libur_pengganti";
          const barColor = isComday ? "#f472b6" : "#6366f1";

          return (
            <div
              key={`${item.id}-${i}`}
              className={`flex gap-3 p-3 rounded-xl border ${isComday
                ? "bg-pink-50/50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/40"
                : "bg-background border-border"
                }`}
            >
              {/* Color bar */}
              <div
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ backgroundColor: barColor }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Row 1: nomor + judul + type badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground tabular-nums pt-0.5 flex-shrink-0">
                      {i + 1}.
                    </span>
                    <p className="font-semibold text-sm leading-snug truncate">
                      {item.title}
                    </p>
                  </div>
                  <TypeBadge task={item} lang={lang} />
                </div>

                {/* Row 2: tanggal */}
                <p className="text-xs text-muted-foreground">
                  📅 {formatDateRange(item, lang)}
                </p>

                {/* Row 3: petugas + status inline */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.flatUser ? (
                       <>
                         <Avatar user={item.flatUser} />
                         <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                           {item.flatUserName}
                         </span>
                       </>
                    ) : (
                       <span className="text-xs text-muted-foreground">
                         {item.flatUserName}
                       </span>
                    )}
                  </div>
                  <StatusBadge status={item.status} lang={lang} />
                </div>

                {/* Row 4: catatan & eq */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-border/50">
                  {item.flatEq && (
                    <div className="flex flex-col gap-0.5 p-1.5 rounded-md bg-muted/40 border border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Camera className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="font-semibold text-primary/90 dark:text-primary-foreground text-[10px] uppercase tracking-wider">{item.flatEq.category_name}</span>
                      </div>
                      <div className="pl-4.5 text-[11px] font-medium leading-tight">
                        {item.flatEq.name}
                      </div>
                      {item.flatEq.serial_number && (
                        <div className="pl-4.5 text-[10px] font-mono text-muted-foreground">
                          S/N: {item.flatEq.serial_number}
                        </div>
                      )}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Per-fotografer view (existing, cleaned up) ───────────────────────────

function TaskRow({ task, lang, userId }) {
  const localeObj = lang === "id" ? id : enUS;
  const dateStr = task.start_date
    ? format(new Date(task.start_date + "T00:00:00"), "d MMM yyyy", {
      locale: localeObj,
    })
    : "-";
  const endStr =
    task.end_date && task.end_date !== task.start_date
      ? format(new Date(task.end_date + "T00:00:00"), "d MMM", { locale: id })
      : null;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0 text-sm">
      <span className="text-muted-foreground w-36 flex-shrink-0 tabular-nums text-xs">
        {dateStr}
        {endStr && <span className="block text-xs">s/d {endStr}</span>}
      </span>
      <span className="flex-1 font-medium truncate">{task.title}</span>

      {/* Show equipment assigned to this specific user for this task */}
      {task.equipment_mapping && task.equipment_mapping[userId] && task.equipment_mapping[userId].length > 0 && (
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
          <Camera className="w-3 h-3" />
          {task.equipment_mapping[userId].length}
        </span>
      )}

      {task.is_comday || task.task_type === "libur_pengganti" ? (
        <span className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 px-2 py-0.5 rounded-full whitespace-nowrap">
          🏖️ {lang === "id" ? "Libur" : "Leave"}
        </span>
      ) : task.description ? (
        <span className="text-xs text-muted-foreground truncate max-w-[100px] hidden lg:block">
          {task.description}
        </span>
      ) : null}
    </div>
  );
}

function PhotographerRow({ user, tasks, maxCount, rank, lang }) {
  const [open, setOpen] = useState(false);

  const regular = tasks.filter(
    (t) => !t.is_comday && t.task_type !== "libur_pengganti",
  );
  const libur = tasks.filter(
    (t) => t.is_comday || t.task_type === "libur_pengganti",
  );
  const total = tasks.length;
  const pct = maxCount > 0 ? (total / maxCount) * 100 : 0;

  // Calculate total equipment used by this user for all tasks this month
  const totalUserEq = tasks.reduce((acc, t) => {
    if (t.equipment_mapping && t.equipment_mapping[user.id]) {
      return acc + t.equipment_mapping[user.id].length;
    }
    return acc;
  }, 0);

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) =>
        (a.start_date || "").localeCompare(b.start_date || ""),
      ),
    [tasks],
  );

  return (
    <div className="border rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm text-muted-foreground w-5 text-right tabular-nums flex-shrink-0">
          {rank}
        </span>
        <Avatar user={user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold truncate">
              {user.full_name || user.email}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className="text-xs text-muted-foreground">
                {regular.length} {lang === "id" ? "tugas" : "tasks"}
              </span>
              {totalUserEq > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Camera className="w-3 h-3 text-primary/70" />
                  {totalUserEq}
                </span>
              )}
              {libur.length > 0 && (
                <span className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 px-2 py-0.5 rounded-full">
                  {libur.length} {lang === "id" ? "libur" : "leave"}
                </span>
              )}
              <span className="text-sm font-bold tabular-nums">{total}</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: user.color || "#64748b",
              }}
            />
          </div>
        </div>
        <div className="flex-shrink-0 text-muted-foreground">
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {open && (
        <div className="px-5 pb-4 border-t bg-muted/20">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {lang === "id"
                ? "Tidak ada tugas bulan ini"
                : "No tasks this month"}
            </p>
          ) : (
            <div className="mt-3">
              {sorted.map((t) => (
                <TaskRow key={t.id} task={t} lang={lang} userId={user.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ReportView({ tasks, users }) {
  const { language } = useGlobalContext();
  const lang = language || "en";
  const MONTHS = lang === "id" ? MONTHS_ID : MONTHS_EN;
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [viewType, setViewType] = useState("table"); // "table" | "photographer" | "equipment"

  // Fetched equipment data
  const [equipmentDict, setEquipmentDict] = useState({});

  useEffect(() => {
    // Fetch equipment dictionary once to properly display equipment info and details
    const fetchEq = async () => {
      const { data } = await supabase.from("equipment").select("*");
      if (data) {
        const dict = {};
        data.forEach(item => {
          dict[item.id] = {
            id: item.id,
            name: item.name,
            serial_number: item.serial_number,
            category_name: item.category || "Lainnya"
          }
        });
        setEquipmentDict(dict);
      }
    }
    fetchEq();
  }, []);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthTasks = useMemo(
    () => tasks.filter((t) => t.start_date?.startsWith(monthStr)),
    [tasks, monthStr],
  );

  // Flattened equipment tasks array mapped by assignee and equipment
  const flattenedMonthTasks = useMemo(() => {
    const flat = [];
    monthTasks.forEach(task => {
      const assigneeIds = task.assignee_ids || [];
      if (assigneeIds.length === 0 && !task.assigned_to_name) {
         flat.push({ ...task, flatUser: null, flatUserName: "-", flatEq: null });
      } else if (assigneeIds.length === 0 && task.assigned_to_name) {
         flat.push({ ...task, flatUser: null, flatUserName: task.assigned_to_name, flatEq: null });
      } else {
         assigneeIds.forEach(uid => {
            const user = users.find(u => u.id === uid);
            const userName = user ? (user.full_name || user.email) : "Unknown";
            
            const userEqIds = (task.equipment_mapping && task.equipment_mapping[uid]) ? task.equipment_mapping[uid] : [];
            
            if (userEqIds.length === 0) {
               flat.push({ ...task, flatUser: user, flatUserName: userName, flatEq: null });
            } else {
               userEqIds.forEach(eqId => {
                  const eq = equipmentDict[eqId];
                  flat.push({ 
                     ...task, 
                     flatUser: user, 
                     flatUserName: userName, 
                     flatEq: eq || { name: "Loading...", category_name: "-", serial_number: "-" } 
                  });
               });
            }
         });
      }
    });

    return flat.sort((a, b) => {
      if (a.start_date !== b.start_date) return (a.start_date || "").localeCompare(b.start_date || "");
      if (a.title !== b.title) return (a.title || "").localeCompare(b.title || "");
      return a.flatUserName.localeCompare(b.flatUserName);
    });
  }, [monthTasks, users, equipmentDict]);

  const perUser = useMemo(() => {
    return users
      .map((user) => ({
        user,
        tasks: monthTasks.filter((t) =>
          (t.assignee_ids || []).includes(user.id),
        ),
      }))
      .filter((row) => row.tasks.length > 0)
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [users, monthTasks]);

  const maxCount = perUser[0]?.tasks.length || 1;

  const totalTasks = monthTasks.length;
  const totalLibur = monthTasks.filter(
    (t) => t.is_comday || t.task_type === "libur_pengganti",
  ).length;
  const totalRegular = totalTasks - totalLibur;
  const activePhotographers = perUser.length;

  const totalEq = monthTasks.reduce((acc, t) => {
    const mapping = t.equipment_mapping || {};
    const count = Object.values(mapping).flat().length;
    return acc + count;
  }, 0);

  const isEmpty = monthTasks.length === 0;

  return (
    <div className="space-y-4 sm:space-y-5 report-content">
      {/* ─── Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 no-print">
        {/* Month / Year â€” full width on mobile */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 sm:flex-none px-3 py-2.5 border rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-2.5 border rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button
              onClick={() => exportCSV(flattenedMonthTasks, month, year, lang)}
              className="flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground active:scale-95"
              title={lang === "id" ? "Unduh CSV" : "Download CSV"}
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors active:scale-95"
          >
            <Printer className="w-4 h-4" />
            {lang === "id" ? "Cetak" : "Print"}
          </button>
        </div>
      </div>

      {/* â”€â”€ Print header (Visible only when printing) â”€â”€ */}
      <div className="print-only hidden pt-4 pb-8 border-b-2 border-zinc-900 mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {lang === "id" ? "LAPORAN BULANAN" : "MONTHLY REPORT"}
        </h1>
        <p className="text-lg font-medium text-zinc-600 mt-1 uppercase tracking-widest">
          {MONTHS[month]} {year}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Still Photo Team Calendar
        </p>
        <hr className="my-3" />
      </div>

      {/* ─── Summary cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: lang === "id" ? "Total Jadwal" : "Total Tasks",
            value: totalTasks,
            cls: "text-blue-600",
          },
          {
            label: lang === "id" ? "Tugas Regular" : "Regular Tasks",
            value: totalRegular,
            cls: "text-indigo-600",
          },
          {
            label: lang === "id" ? "Libur Pengganti" : "Replacement Leave",
            value: totalLibur,
            cls: "text-pink-600",
          },
          {
            label: lang === "id" ? "Fotografer Aktif" : "Active Assignees",
            value: activePhotographers,
            cls: "text-orange-600",
          },
          {
            label: lang === "id" ? "Total Alat Dipakai" : "Total Equipment",
            value: totalEq,
            cls: "text-violet-600",
          },
        ].map(({ label, value, cls }) => (
          <div
            key={label}
            className="bg-background border rounded-2xl p-3.5 sm:p-4"
          >
            <p className={`text-3xl font-bold tabular-nums ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* â”€â”€ View toggle â”€â”€ */}
      {!isEmpty && (
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit no-print">
          <button
            onClick={() => setViewType("table")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewType === "table"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <LayoutList className="w-4 h-4" />
            <span className="hidden xs:inline sm:hidden">
              {lang === "id" ? "Tabel" : "Table"}
            </span>
            <span className="hidden sm:inline">
              {lang === "id" ? "Tabel Harian" : "Daily Table"}
            </span>
          </button>
          <button
            onClick={() => setViewType("photographer")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewType === "photographer"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden xs:inline sm:hidden">
              {lang === "id" ? "Orang" : "Person"}
            </span>
            <span className="hidden sm:inline">
              {lang === "id" ? "Per Fotografer" : "By Assignee"}
            </span>
          </button>
        </div>
      )}

      {/* â”€â”€ Empty state â”€â”€ */}
      {isEmpty && (
        <div className="text-center py-12 sm:py-14 bg-background border rounded-2xl text-muted-foreground">
          <span className="text-4xl block mb-3">📊</span>
          <p className="text-sm">
            {lang === "id" ? "Tidak ada jadwal di" : "No tasks in"}{" "}
            {MONTHS[month]} {year}
          </p>
        </div>
      )}

      {/* â”€â”€ Tabel Harian â”€â”€ */}
      {!isEmpty && viewType === "table" && (
        <div className="space-y-2.5 sm:space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {lang === "id" ? "Jadwal" : "Tasks"} {MONTHS[month]} {year}
          </h2>

          {/* Print title for table view */}
          <div className="print-only hidden">
            <h2 className="font-bold text-base mb-2">
              {lang === "id" ? "Daftar Jadwal Harian" : "Daily Task List"}
            </h2>
          </div>

          <DailyTable flattenedTasks={flattenedMonthTasks} lang={lang} />

          {/* Print: simple flat table */}
          <div className="print-only hidden mt-4 text-xs">
            <p className="text-muted-foreground">
              Total: {totalTasks} {lang === "id" ? "jadwal" : "tasks"} |{" "}
              {totalRegular} regular | {totalLibur}{" "}
              {lang === "id" ? "libur pengganti" : "replacement leave"}
            </p>
          </div>
        </div>
      )}

      {/* ─── Per Fotografer ─── */}
      {!isEmpty && viewType === "photographer" && (
        <div className="space-y-2.5 sm:space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {lang === "id"
              ? "Beban Kerja Per Fotografer"
              : "Workload By Assignee"}
          </h2>
          {perUser.map(({ user, tasks: userTasks }, i) => (
            <PhotographerRow
              key={user.id}
              user={user}
              tasks={userTasks}
              maxCount={maxCount}
              rank={i + 1}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
}
