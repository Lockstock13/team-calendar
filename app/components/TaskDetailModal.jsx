import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { Calendar, X, Camera, Wrench } from "lucide-react";
import TypeBadge from "@/app/components/TypeBadge";
import Avatar from "@/app/components/Avatar";
import { supabase } from "@/lib/supabase";
import EquipmentAssignmentModal from "./EquipmentAssignmentModal";

export default function TaskDetailModal({
    task,
    users,
    onClose,
    lang,
    onEdit = null,
    onDelete = null,
    currentUserId = null,
}) {
    const [equipmentList, setEquipmentList] = useState([]);
    const [showEqModal, setShowEqModal] = useState(false);
    const [localTask, setLocalTask] = useState(task);

    useEffect(() => {
        const fetchEq = async () => {
            try {
                const { data, error } = await supabase
                    .from("equipment")
                    .select("*");
                if (!error && data) {
                    setEquipmentList(data);
                }
            } catch (error) {
                console.error("Failed to load equipment", error);
            }
        };
        fetchEq();
    }, []);

    if (!localTask) return null;

    const assignees = (localTask.assignee_ids || [])
        .map((uid) => users.find((u) => u.id === uid))
        .filter(Boolean);

    // Can manage equipment if they are an admin or an assignee
    const canManageEq = currentUserId && (
        users.find(u => u.id === currentUserId)?.role === "admin" ||
        (localTask.assignee_ids || []).includes(currentUserId)
    );

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
                                className={`text-lg font-bold mt-2 leading-tight ${localTask.status === "done" ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground dark:text-zinc-100"}`}
                            >
                                {localTask.title}
                            </h3>
                            <p className="text-[13px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {localTask.start_date
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

                        {localTask.description && (
                            <div className="pt-2">
                                <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                                    {lang === "id" ? "Catatan" : "Notes"}
                                </p>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border shadow-inner">
                                    <p className="text-[13px] text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                                        {localTask.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[12px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
                                    {lang === "id" ? "Tim Penugasan & Alat" : "Assigned Team & Equipment"}
                                </p>
                                {canManageEq && assignees.length > 0 && (
                                    <button
                                        onClick={() => setShowEqModal(true)}
                                        className="text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                    >
                                        <Wrench className="w-3 h-3" />
                                        {lang === "id" ? "Kelola Alat" : "Manage Equipment"}
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {assignees.length > 0 ? (
                                    assignees.map((u) => {
                                        const userEqIds = (localTask.equipment_mapping || {})[u.id] || [];
                                        const userEquipments = userEqIds.map(eqId =>
                                            equipmentList.find(e => e.id === eqId)
                                        ).filter(Boolean);

                                        return (
                                            <div key={u.id} className="flex flex-col gap-1.5 p-2 bg-background border border-border rounded-xl shadow-sm min-w-[140px] flex-1 sm:flex-none">
                                                <div className="flex items-center gap-2">
                                                    <Avatar user={u} size="sm" />
                                                    <span className="text-[13px] font-semibold text-foreground/90 truncate">
                                                        {u.full_name || u.email.split("@")[0]}
                                                    </span>
                                                </div>
                                                {userEquipments.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1 pl-1">
                                                        {userEquipments.map(eq => (
                                                            <span key={eq.id} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 whitespace-nowrap">
                                                                <Camera className="w-2.5 h-2.5" />
                                                                {eq.name} {eq.serial_number ? `(SN: ${eq.serial_number})` : ""}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
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
                                            onEdit(localTask);
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
                                            onDelete(localTask.id);
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

            {showEqModal && (
                <EquipmentAssignmentModal
                    task={localTask}
                    users={users}
                    lang={lang}
                    onClose={() => setShowEqModal(false)}
                    onSave={(newMapping) => {
                        setLocalTask(prev => ({ ...prev, equipment_mapping: newMapping }));
                        setShowEqModal(false);
                    }}
                />
            )}
        </div>
    );
}
