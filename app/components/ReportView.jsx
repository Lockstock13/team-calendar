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

const MONTHS = [
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

function TypeBadge({ task }) {
  if (task.is_comday || task.task_type === "libur_pengganti") {
    return (
      <span className="inline-flex items-center text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
        🏖️ Libur Pengganti
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
      📅 Regular
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    todo: { label: "Belum Mulai", cls: "bg-muted text-muted-foreground" },
    in_progress: { label: "Berjalan", cls: "bg-amber-100 text-amber-700" },
    done: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
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

function formatDateRange(task) {
  const start = task.start_date
    ? format(new Date(task.start_date + "T00:00:00"), "d MMM yyyy", {
        locale: id,
      })
    : "-";
  const end =
    task.end_date && task.end_date !== task.start_date
      ? format(new Date(task.end_date + "T00:00:00"), "d MMM yyyy", {
          locale: id,
        })
      : null;
  return end ? `${start} – ${end}` : start;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(tasks, users, month, year) {
  const monthLabel = MONTHS[month];
  const header = [
    "No",
    "Tanggal",
    "Tugas",
    "Petugas",
    "Tipe",
    "Status",
    "Catatan",
  ];

  const rows = tasks.map((task, i) => {
    const dateStr = task.start_date
      ? format(new Date(task.start_date + "T00:00:00"), "d MMM yyyy", {
          locale: id,
        })
      : "-";
    const endStr =
      task.end_date && task.end_date !== task.start_date
        ? ` - ${format(new Date(task.end_date + "T00:00:00"), "d MMM yyyy", { locale: id })}`
        : "";
    const assigneeNames = task.assigned_to_name || "-";
    const tipe =
      task.is_comday || task.task_type === "libur_pengganti"
        ? "Libur Pengganti"
        : "Regular";
    const statusMap = {
      todo: "Belum Mulai",
      in_progress: "Berjalan",
      done: "Selesai",
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
  a.download = `Laporan_${monthLabel}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tabel Harian ─────────────────────────────────────────────────────────────

function DailyTable({ tasks, users }) {
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
                Tanggal
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tugas
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-44">
                Petugas
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">
                Tipe
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Catatan / Info
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
                  className={`hover:bg-muted/20 transition-colors ${
                    task.is_comday || task.task_type === "libur_pengganti"
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
                          { locale: id },
                        )
                      : "-"}
                    {task.end_date && task.end_date !== task.start_date && (
                      <span className="block text-xs text-muted-foreground font-normal">
                        s/d{" "}
                        {format(
                          new Date(task.end_date + "T00:00:00"),
                          "d MMM yyyy",
                          { locale: id },
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
                    <TypeBadge task={task} />
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
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
              className={`p-4 space-y-2 ${
                task.is_comday || task.task_type === "libur_pengganti"
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
                      {formatDateRange(task)}
                    </p>
                  </div>
                </div>
                <TypeBadge task={task} />
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
                <StatusBadge status={task.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Per-fotografer view (existing, cleaned up) ───────────────────────────────

function TaskRow({ task }) {
  const dateStr = task.start_date
    ? format(new Date(task.start_date + "T00:00:00"), "d MMM yyyy", {
        locale: id,
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
          🏖️ Libur
        </span>
      ) : task.description ? (
        <span className="text-xs text-muted-foreground truncate max-w-[100px] hidden lg:block">
          {task.description}
        </span>
      ) : null}
    </div>
  );
}

function PhotographerRow({ user, tasks, maxCount, rank }) {
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
                {regular.length} tugas
              </span>
              {libur.length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  {libur.length} libur
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
              Tidak ada tugas bulan ini
            </p>
          ) : (
            <div className="mt-3">
              {sorted.map((t) => (
                <TaskRow key={t.id} task={t} />
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
              onClick={() => exportCSV(monthTasks, users, month, year)}
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
          Laporan Bulanan — {MONTHS[month]} {year}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Still Photo Team Calendar
        </p>
        <hr className="my-3" />
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Jadwal", value: totalTasks, cls: "text-blue-600" },
          {
            label: "Tugas Regular",
            value: totalRegular,
            cls: "text-indigo-600",
          },
          {
            label: "Libur Pengganti",
            value: totalLibur,
            cls: "text-emerald-600",
          },
          {
            label: "Fotografer Aktif",
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewType === "table"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="w-4 h-4" />
            Tabel Harian
          </button>
          <button
            onClick={() => setViewType("photographer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewType === "photographer"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Per Fotografer
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="text-center py-16 bg-background border rounded-2xl text-muted-foreground">
          <span className="text-4xl block mb-3">📊</span>
          <p className="text-sm">
            Tidak ada jadwal di {MONTHS[month]} {year}
          </p>
        </div>
      )}

      {/* ── Tabel Harian ── */}
      {!isEmpty && viewType === "table" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Jadwal {MONTHS[month]} {year}
          </h2>

          {/* Print title for table view */}
          <div className="print-only hidden">
            <h2 className="font-bold text-base mb-2">Daftar Jadwal Harian</h2>
          </div>

          <DailyTable tasks={monthTasks} users={users} />

          {/* Print: simple flat table */}
          <div className="print-only hidden mt-4 text-xs">
            <p className="text-muted-foreground">
              Total: {totalTasks} jadwal | {totalRegular} regular | {totalLibur}{" "}
              libur pengganti
            </p>
          </div>
        </div>
      )}

      {/* ── Per Fotografer ── */}
      {!isEmpty && viewType === "photographer" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Beban Kerja Per Fotografer
          </h2>
          {perUser.map(({ user, tasks: userTasks }, i) => (
            <PhotographerRow
              key={user.id}
              user={user}
              tasks={userTasks}
              maxCount={maxCount}
              rank={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
