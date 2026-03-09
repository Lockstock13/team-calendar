import { format } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { Calendar, X } from "lucide-react";
import TypeBadge from "@/app/components/TypeBadge";
import Avatar from "@/app/components/Avatar";

export default function TaskDetailModal({
    task,
    users,
    onClose,
    lang,
    onEdit = null,
    onDelete = null,
}) {
    if (!task) return null;

    const assignees = (task.assignee_ids || [])
        .map((uid) => users.find((u) => u.id === uid))
        .filter(Boolean);

    const statusLabel = {
        todo: lang === "id" ? "Belum Mulai" : "Not Started",
        in_progress: lang === "id" ? "Sedang Berjalan" : "In Progress",
        done: lang === "id" ? "Selesai" : "Done",
    };

    const priorityLabel = {
        low: lang === "id" ? "🟢 Rendah" : "🟢 Low",
        medium: lang === "id" ? "🟡 Sedang" : "🟡 Medium",
        high: lang === "id" ? "🔴 Tinggi" : "🔴 High",
    };

    const accentColor =
        task.is_comday || task.task_type === "libur_pengganti"
            ? "#10b981"
            : task.is_weekend_task
                ? "#a855f7"
                : assignees[0]?.color || "#64748b";

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header / Type Accent */}
                <div className="h-1.5" style={{ backgroundColor: accentColor }} />

                <div className="p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-muted-foreground/80 hover:bg-muted hover:text-foreground rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="space-y-4 pt-2">
                        <div>
                            <div className="flex gap-2 items-center flex-wrap mb-2.5">
                                <TypeBadge task={task} lang={lang} />
                                {task.priority && (
                                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-sm font-medium border border-border">
                                        {priorityLabel[task.priority] || task.priority}
                                    </span>
                                )}
                                {task.status !== "done" && (
                                    <span className="text-[10px] bg-zinc-100/50 text-zinc-500 px-2 py-0.5 rounded-sm font-medium border border-border/50">
                                        {statusLabel[task.status] || task.status}
                                    </span>
                                )}
                            </div>
                            <h3
                                className={`text-lg font-bold mt-2 leading-tight ${task.status === "done" ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground dark:text-zinc-100"}`}
                            >
                                {task.title}
                            </h3>
                            <p className="text-[13px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {task.start_date
                                    ? format(
                                        new Date(task.start_date + "T00:00:00"),
                                        "EEEE, d MMMM yyyy",
                                        { locale: lang === "id" ? id : enUS },
                                    )
                                    : "—"}
                                {task.end_date &&
                                    task.end_date !== task.start_date &&
                                    ` – ${format(
                                        new Date(task.end_date + "T00:00:00"),
                                        "EEEE, d MMM yyyy",
                                        { locale: lang === "id" ? id : enUS },
                                    )}`}
                            </p>
                        </div>

                        {task.description && (
                            <div className="pt-2">
                                <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                                    {lang === "id" ? "Catatan" : "Notes"}
                                </p>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border shadow-inner">
                                    <p className="text-[13px] text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                                        {task.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                                {lang === "id" ? "Tim Penugasan" : "Assigned Team"}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {assignees.length > 0 ? (
                                    assignees.map((u) => (
                                        <div
                                            key={u.id}
                                            className="flex items-center gap-2 bg-background border border-border pl-1 pr-3 py-1 rounded-full shadow-sm"
                                        >
                                            <Avatar user={u} size="sm" />
                                            <span className="text-[12px] font-medium text-foreground/90">
                                                {u.full_name || u.email.split("@")[0]}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-[12px] text-muted-foreground/60 italic">
                                        {lang === "id" ? "Tidak ada tim." : "No assignees."}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Editing and Deleting Triggers for Calendar View Support */}
                        {(onEdit || onDelete) && (
                            <div className="pt-5 border-t border-border mt-5 flex gap-2">
                                {onEdit && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onEdit(task);
                                        }}
                                        className="flex-1 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                        {lang === "id" ? "Edit" : "Edit"}
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onDelete(task.id);
                                        }}
                                        className="flex-1 py-2.5 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-600 hover:text-white transition-colors"
                                    >
                                        {lang === "id" ? "Hapus" : "Delete"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
