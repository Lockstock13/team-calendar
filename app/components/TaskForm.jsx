"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import { useGlobalContext } from "@/app/providers";
import Avatar from "@/app/components/Avatar";


const getTaskTypes = (lang) => [
  {
    id: "regular",
    label: "📅 Regular",
    desc: lang === "id" ? "Penugasan hari kerja" : "Workday assignment",
    border: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    active: "ring-blue-400",
  },
  {
    id: "libur_pengganti",
    label: lang === "id" ? "🏖️ Libur Pengganti" : "🏖️ Replacement Leave",
    desc: lang === "id" ? "Hari libur pengganti" : "Replacement leave day",
    border: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    active: "ring-emerald-400",
  },
];



export default function TaskForm({
  users,
  editingTask,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const { addToast } = useToast();
  const { language } = useGlobalContext();
  const lang = language || "en";
  const TASK_TYPES = getTaskTypes(lang);

  const getInitialType = () => {
    if (!editingTask) return "regular";
    if (editingTask.is_comday || editingTask.task_type === "libur_pengganti")
      return "libur_pengganti";
    return "regular";
  };

  const [data, setData] = useState({
    title: editingTask?.title || "",
    description: editingTask?.description || "",
    start_date: editingTask?.start_date || "",
    end_date: editingTask?.end_date || "",
    assignee_ids: editingTask?.assignee_ids || [],
    is_recurring: false,
    recurring_until: "",
    task_type: getInitialType(),
  });

  const toggleAssignee = (userId) => {
    setData((prev) => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter((id) => id !== userId)
        : [...prev.assignee_ids, userId],
    }));
  };

  const handleTypeChange = (typeId) => {
    setData((prev) => ({
      ...prev,
      task_type: typeId,
      title:
        typeId === "libur_pengganti" && !editingTask && prev.title === ""
          ? "Libur Pengganti"
          : typeId !== "libur_pengganti" && prev.title === "Libur Pengganti"
            ? ""
            : prev.title,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (data.assignee_ids.length === 0) {
      addToast(lang === "id" ? "Pilih minimal 1 anggota." : "Select at least 1 assignee.", "error");
      return;
    }
    if (data.is_recurring && !data.recurring_until) {
      addToast(lang === "id" ? "Pilih tanggal berakhir pengulangan." : "Select recurrence end date.", "error");
      return;
    }
    onSubmit(data);
  };

  const isLibur = data.task_type === "libur_pengganti";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl border shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b sticky top-0 bg-background z-10 rounded-t-2xl sm:rounded-t-2xl">
          <h2 className="font-semibold text-base">
            {editingTask ? (lang === "id" ? "Edit Jadwal" : "Edit Task") : (lang === "id" ? "Tambah Jadwal" : "Add Task")}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Task Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "id" ? "Tipe Jadwal" : "Task Type"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeChange(type.id)}
                  className={`p-3 border-2 rounded-xl text-left transition-all ${data.task_type === type.id
                    ? `${type.border} ring-2 ${type.active} ring-offset-1`
                    : "border-border hover:bg-muted"
                    }`}
                >
                  <div className="text-sm font-semibold leading-snug">
                    {type.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    {type.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "id" ? "Judul" : "Title"}
            </label>
            <input
              type="text"
              placeholder={isLibur ? (lang === "id" ? "Libur Pengganti" : "Replacement Leave") : (lang === "id" ? "Judul tugas / event" : "Task title / event")}
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              required
            />
          </div>

          {/* Description — hide for libur pengganti */}
          {!isLibur && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "id" ? "Catatan" : "Notes"}
              </label>
              <textarea
                placeholder={lang === "id" ? "Lokasi, catatan, PIC, dll" : "Location, notes, PIC, etc."}
                value={data.description}
                onChange={(e) =>
                  setData({ ...data, description: e.target.value })
                }
                className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "id" ? "Tanggal" : "Date"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{lang === "id" ? "Mulai" : "Start"}</p>
                <input
                  type="date"
                  value={data.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const newEnd =
                      data.end_date && data.end_date >= newStart
                        ? data.end_date
                        : newStart;
                    setData({
                      ...data,
                      start_date: newStart,
                      end_date: newEnd,
                    });
                  }}
                  className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  required
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{lang === "id" ? "Selesai" : "End"}</p>
                <input
                  type="date"
                  value={data.end_date}
                  onChange={(e) =>
                    setData({ ...data, end_date: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  min={data.start_date}
                  required
                />
              </div>
            </div>
          </div>

          {/* Recurrence — Only for NEW tasks */}
          {!editingTask && (
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setData({ ...data, is_recurring: !data.is_recurring })}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${data.is_recurring ? 'bg-primary border-primary' : 'border-muted-foreground/30 group-hover:border-primary'}`}>
                    {data.is_recurring && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium">
                    {lang === "id" ? "Ulangi Jadwal Tiap Minggu?" : "Repeat this Task Weekly?"}
                  </span>
                </div>
              </div>

              {data.is_recurring && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    {lang === "id" ? "Berakhir Pada" : "Repeat Until"}
                  </label>
                  <input
                    type="date"
                    value={data.recurring_until}
                    onChange={(e) => setData({ ...data, recurring_until: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    min={data.end_date || data.start_date}
                    required={data.is_recurring}
                  />
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {lang === "id"
                      ? "📝 Jadwal akan dibuat setiap 7 hari sekali sampai tanggal yang dipilih."
                      : "📝 Task will be duplicated every 7 days until the selected date."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photographer Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "id" ? "Anggota" : "Assignees"}{" "}
              {data.assignee_ids.length > 0 &&
                `(${data.assignee_ids.length} ${lang === "id" ? "dipilih" : "selected"})`}
            </label>
            <div className="border rounded-xl overflow-hidden divide-y max-h-44 sm:max-h-52 overflow-y-auto">
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  {lang === "id" ? "Belum ada anggota" : "No members yet"}
                </p>
              )}
              {users.map((user) => {
                const selected = data.assignee_ids.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleAssignee(user.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                  >
                    <Avatar user={user} selected={selected} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                        }`}
                    >
                      {selected && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
            >
              {lang === "id" ? "Batal" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {lang === "id" ? "Menyimpan..." : "Saving..."}
                </>
              ) : editingTask ? (
                lang === "id" ? "Simpan Perubahan" : "Save Changes"
              ) : (
                lang === "id" ? "Tambah Jadwal" : "Add Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
