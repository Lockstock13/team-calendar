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

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ user }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: user?.color || "#64748b" }}
    >
      {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function TypeBadge({ task, lang }) {
  if (task.is_comday || task.task_type === "libur_pengganti") {
    return (
      <span className="inline-flex items-center text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
        🏖️ {lang === "id" ? "Libur Pengganti" : "Replacement Leave"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
      📅 Regular
    </span>
  );
}

function StatusBadge({ status, lang }) {
  const map = {
    todo: { label: lang === "id" ? "Belum Mulai" : "Not Started", cls: "bg-muted text-muted-foreground" },
    in_progress: { label: lang === "id" ? "Berjalan" : "In Progress", cls: "bg-amber-100 text-amber-700" },
    done: { label: lang === "id" ? "Selesai" : "Done", cls: "bg-emerald-100 text-emerald-700" },
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
  return end ? `${start} – ${end}` : start;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(tasks, users, month, year, lang) {
  const MONTHS = lang === "id" ? MONTHS_ID : MONTHS_EN;
  const monthLabel = MONTHS[month];
  const header = [
    "No",
    lang === "id" ? "Tanggal" : "Date",
    lang === "id" ? "Tugas" : "Task",
    lang === "id" ? "Petugas" : "Assignee",
    lang === "id" ? "Tipe" : "Type",
    "Status",
    lang === "id" ? "Catatan" : "Notes",
  ];

  const rows = tasks.map((task, i) => {
    const localeObj = lang === "id" ? id : enUS;
    const dateStr = task.start_date
      ? format(new Date(task.start_date + "T00:00:00"), "d MMM yyyy", {
        locale: localeObj,
      })
      : "-";
    const endStr =
      task.end_date && task.end_date !== task.start_date
        ? ` - ${format(new Date(task.end_date + "T00:00:00"), "d MMM yyyy", { locale: localeObj })}`
        : "";
    const assigneeNames = task.assigned_to_name || "-";
    const tipe =
      task.is_comday || task.task_type === "libur_pengganti"
        ? (lang === "id" ? "Libur Pengganti" : "Replacement Leave")
        : "Regular";
    const statusMap = {
      todo: lang === "id" ? "Belum Mulai" : "Not Started",
      in_progress: lang === "id" ? "Berjalan" : "In Progress",
      done: lang === "id" ? "Selesai" : "Done",
    };
    const status = statusMap[task.status] || task.status || "-";
    const catatan = (task.description || "").replace(/"/g, '""');

    return [
      i + 1,
      `"${dateStr}${endStr}"`,
      `"${task.title}"`,
      `"${assigneeNames}"`,
      `"${tipe}"`,
      `"${status}"`,
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

// ─── Tabel Harian ─────────────────────────────────────────────────────────────

function DailyTable({ tasks, users, lang }) {
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) =>
        (a.start_date || "").localeCompare(b.start_date || ""),
      ),
    [tasks],
  );

  if (sorted.length === 0) return null;

  return (
    <div className="bg-background border rounded-2xl overflow-hidden">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8">
                No
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40">
                {lang === "id" ? "Tanggal" : "Date"}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "id" ? "Tugas" : "Task"}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-44">
                {lang === "id" ? "Petugas" : "Assignee"}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">
                {lang === "id" ? "Tipe" : "Type"}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "id" ? "Catatan / Info" : "Notes"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((task, i) => {
              const assigneeList = (task.assignee_ids || [])
                .map((uid) => users.find((u) => u.id === uid))
                .filter(Boolean);
              const assigneeDisplay =
                assigneeList.length > 0
                  ? assigneeList
                  : task.assigned_to_name
                    ? [
                      {
                        full_name: task.assigned_to_name,
                        color: "#64748b",
                        id: "fallback",
                      },
                    ]
                    : [];

              return (
                <tr
                  key={task.id}
                  className={`hover:bg-muted/20 transition-colors ${task.is_comday || task.task_type === "libur_pengganti"
                    ? "bg-emerald-50/40"
                    : ""
                    }`}
                >
                  {/* No */}
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {i + 1}
                  </td>
                  {/* Tanggal */}
                  <td className="px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
                    {task.start_date
                      ? format(
                        new Date(task.start_date + "T00:00:00"),
                        "EEE, d MMM yyyy",
                        { locale: lang === "id" ? id : enUS },
                      )
                      : "-"}
                    {task.end_date && task.end_date !== task.start_date && (
                      <span className="block text-xs text-muted-foreground font-normal">
                        {lang === "id" ? "s/d " : "to "}
                        {format(
                          new Date(task.end_date + "T00:00:00"),
                          "d MMM yyyy",
                          { locale: lang === "id" ? id : enUS },
                        )}
                      </span>
                    )}
                  </td>
                  {/* Tugas */}
                  <td className="px-4 py-3 font-semibold">{task.title}</td>
                  {/* Petugas */}
                  <td className="px-4 py-3">
                    {assigneeList.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {assigneeList.map((u) => (
                          <div key={u.id} className="flex items-center gap-1.5">
                            <Avatar user={u} />
                            <span className="text-xs truncate max-w-[110px]">
                              {u.full_name || u.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {task.assigned_to_name || "-"}
                      </span>
                    )}
                  </td>
                  {/* Tipe */}
                  <td className="px-4 py-3">
                    <TypeBadge task={task} lang={lang} />
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} lang={lang} />
                  </td>
                  {/* Catatan */}
                  <td className="px-4 py-3 text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                    {task.description || (
                      <span className="italic opacity-50">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden divide-y">
        {sorted.map((task, i) => {
          const assigneeList = (task.assignee_ids || [])
            .map((uid) => users.find((u) => u.id === uid))
            .filter(Boolean);

          return (
            <div
              key={task.id}
              className={`p-4 space-y-2 ${task.is_comday || task.task_type === "libur_pengganti"
                ? "bg-emerald-50/50"
                : ""
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums pt-0.5 w-5">
                    {i + 1}.
                  </span>
                  <div>
                    <p className="font-semibold text-sm leading-snug">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateRange(task, lang)}
                    </p>
                  </div>
                </div>
                <TypeBadge task={task} lang={lang} />
              </div>

              {/* Petugas */}
              {(assigneeList.length > 0 || task.assigned_to_name) && (
                <div className="flex items-center gap-1.5 pl-7">
                  {assigneeList.length > 0 ? (
                    <>
                      <div className="flex -space-x-1">
                        {assigneeList.map((u) => (
                          <Avatar key={u.id} user={u} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {assigneeList
                          .map((u) => u.full_name || u.email)
                          .join(", ")}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {task.assigned_to_name}
                    </span>
                  )}
                </div>
              )}

              {/* Catatan */}
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed pl-7 italic">
                  {task.description}
                </p>
              )}

              {/* Status */}
              <div className="pl-7">
                <StatusBadge status={task.status} lang={lang} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Per-fotografer view (existing, cleaned up) ───────────────────────────────

function TaskRow({ task, lang }) {
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
      {task.is_comday || task.task_type === "libur_pengganti" ? (
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">
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
              {libur.length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
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
              {lang === "id" ? "Tidak ada tugas bulan ini" : "No tasks this month"}
            </p>
          ) : (
            <div className="mt-3">
              {sorted.map((t) => (
                <TaskRow key={t.id} task={t} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportView({ tasks, users }) {
  const { language } = useGlobalContext();
  const lang = language || "en";
  const MONTHS = lang === "id" ? MONTHS_ID : MONTHS_EN;
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [viewType, setViewType] = useState("table"); // "table" | "photographer"

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthTasks = useMemo(
    () => tasks.filter((t) => t.start_date?.startsWith(monthStr)),
    [tasks, monthStr],
  );

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

  const isEmpty = monthTasks.length === 0;

  return (
    <div className="space-y-5 report-content">
      {/* ── Controls ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        {/* Month / Year */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="px-3 py-2 border rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              onClick={() => exportCSV(monthTasks, users, month, year, lang)}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* ── Print header ── */}
      <div className="print-only hidden">
        <h1 className="text-xl font-bold">
          {lang === "id" ? "Laporan Bulanan" : "Monthly Report"} — {MONTHS[month]} {year}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Still Photo Team Calendar
        </p>
        <hr className="my-3" />
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: lang === "id" ? "Total Jadwal" : "Total Tasks", value: totalTasks, cls: "text-blue-600" },
          {
            label: lang === "id" ? "Tugas Regular" : "Regular Tasks",
            value: totalRegular,
            cls: "text-indigo-600",
          },
          {
            label: lang === "id" ? "Libur Pengganti" : "Replacement Leave",
            value: totalLibur,
            cls: "text-emerald-600",
          },
          {
            label: lang === "id" ? "Fotografer Aktif" : "Active Assignees",
            value: activePhotographers,
            cls: "text-orange-600",
          },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-background border rounded-2xl p-4">
            <p className={`text-3xl font-bold tabular-nums ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── View toggle ── */}
      {!isEmpty && (
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit no-print">
          <button
            onClick={() => setViewType("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewType === "table"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <LayoutList className="w-4 h-4" />
            {lang === "id" ? "Tabel Harian" : "Daily Table"}
          </button>
          <button
            onClick={() => setViewType("photographer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewType === "photographer"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            {lang === "id" ? "Per Fotografer" : "By Assignee"}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="text-center py-16 bg-background border rounded-2xl text-muted-foreground">
          <span className="text-4xl block mb-3">📊</span>
          <p className="text-sm">
            {lang === "id" ? "Tidak ada jadwal di" : "No tasks in"} {MONTHS[month]} {year}
          </p>
        </div>
      )}

      {/* ── Tabel Harian ── */}
      {!isEmpty && viewType === "table" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {lang === "id" ? "Jadwal" : "Tasks"} {MONTHS[month]} {year}
          </h2>

          {/* Print title for table view */}
          <div className="print-only hidden">
            <h2 className="font-bold text-base mb-2">{lang === "id" ? "Daftar Jadwal Harian" : "Daily Task List"}</h2>
          </div>

          <DailyTable tasks={monthTasks} users={users} lang={lang} />

          {/* Print: simple flat table */}
          <div className="print-only hidden mt-4 text-xs">
            <p className="text-muted-foreground">
              Total: {totalTasks} {lang === "id" ? "jadwal" : "tasks"} | {totalRegular} regular | {totalLibur}{" "}
              {lang === "id" ? "libur pengganti" : "replacement leave"}
            </p>
          </div>
        </div>
      )}

      {/* ── Per Fotografer ── */}
      {!isEmpty && viewType === "photographer" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {lang === "id" ? "Beban Kerja Per Fotografer" : "Workload By Assignee"}
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
