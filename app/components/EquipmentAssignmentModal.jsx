"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Check, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/app/components/ToastProvider";
import Avatar from "@/app/components/Avatar";

export default function EquipmentAssignmentModal({
    task,
    users,
    onClose,
    onSave,
    lang = "id",
}) {
    const { addToast } = useToast();
    const [equipmentList, setEquipmentList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Local state to track which equipment is assigned to which user
    // { userId: [equipmentId1, equipmentId2] }
    const [mapping, setMapping] = useState(task.equipment_mapping || {});

    // Which user's equipment is currently being edited
    const assignees = (task.assignee_ids || [])
        .map((uid) => users.find((u) => u.id === uid))
        .filter(Boolean);

    const [selectedUserId, setSelectedUserId] = useState(assignees[0]?.id || null);

    useEffect(() => {
        const fetchEq = async () => {
            try {
                const { data, error } = await supabase
                    .from("equipment")
                    .select("*")
                    .neq("status", "Rusak") // Only show non-broken
                    .order("name", { ascending: true });

                if (error) throw error;
                setEquipmentList(data || []);
            } catch (err) {
                console.error("Failed to load equipment", err);
                addToast(lang === "id" ? "Gagal memuat daftar alat" : "Failed to load equipment", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchEq();
    }, [addToast, lang]);

    // Group equipment by category
    const groupedEquipment = useMemo(() => {
        const groups = {};
        equipmentList.forEach(eq => {
            const cat = eq.category || "Lainnya";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(eq);
        });
        return groups;
    }, [equipmentList]);

    const toggleEquipment = (equipmentId) => {
        if (!selectedUserId) return;

        // Check if this equipment is already taken by someone else
        const takenByOtherId = Object.entries(mapping).find(([uid, eqIds]) =>
            uid !== selectedUserId && eqIds.includes(equipmentId)
        )?.[0];

        if (takenByOtherId) {
            const otherUser = users.find(u => u.id === takenByOtherId);
            const userName = otherUser?.full_name || otherUser?.email || "User lain";
            addToast(lang === "id"
                ? `Alat ini sudah dipilih oleh ${userName}`
                : `This equipment is already selected by ${userName}`, "warning");
            return;
        }

        setMapping(prev => {
            const currentUserEqs = prev[selectedUserId] || [];
            const isSelected = currentUserEqs.includes(equipmentId);

            const newEqs = isSelected
                ? currentUserEqs.filter(id => id !== equipmentId)
                : [...currentUserEqs, equipmentId];

            return {
                ...prev,
                [selectedUserId]: newEqs
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Because task_equipment handles the relation, we need to clear old ones for this task and insert new ones
            // 1. Delete all equipment mapping for this task
            const { error: deleteError } = await supabase
                .from("task_equipment")
                .delete()
                .eq("task_id", task.id);

            if (deleteError) throw deleteError;

            const currentAssigneeIds = task.assignee_ids || [];
            const inserts = [];
            Object.entries(mapping).forEach(([userId, eqIds]) => {
                // Only save if the user is still an assignee
                if (currentAssigneeIds.includes(userId)) {
                    eqIds.forEach(eqId => {
                        inserts.push({
                            task_id: task.id,
                            user_id: userId,
                            equipment_id: eqId
                        });
                    });
                }
            });

            if (inserts.length > 0) {
                const { error: insertError } = await supabase
                    .from("task_equipment")
                    .insert(inserts);

                if (insertError) throw insertError;
            }

            addToast(lang === "id" ? "Alat berhasil disimpan" : "Equipment saved successfully", "success");
            onSave(mapping); // Pass back the new mapping
        } catch (error) {
            console.error(error);
            addToast(error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    if (assignees.length === 0) {
        return null; // Should not happen, but safeguard
    }

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                    <div>
                        <h2 className="font-bold text-lg">
                            {lang === "id" ? "Kelola Alat Studio" : "Manage Equipment"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {task.title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Split layout for larger screens */}
                <div className="flex flex-col sm:flex-row overflow-hidden flex-1">
                    {/* Left side: Assignees List */}
                    <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-border bg-muted/10 overflow-y-auto p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-3">
                            {lang === "id" ? "Pilih Fotografer" : "Select Assignee"}
                        </p>
                        {assignees.map(user => {
                            const isSelected = selectedUserId === user.id;
                            const count = (mapping[user.id] || []).length;

                            return (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "bg-background border border-border hover:border-primary/50 text-foreground"
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={isSelected ? "ring-2 ring-white/50 rounded-full" : ""}>
                                            <Avatar user={user} size="sm" />
                                        </div>
                                        <span className="font-medium text-sm truncate">
                                            {user.full_name || user.email.split("@")[0]}
                                        </span>
                                    </div>
                                    {count > 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                                            }`}>
                                            {count}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right side: Equipment Categories */}
                    <div className="flex-1 overflow-y-auto p-5 bg-background">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.keys(groupedEquipment).length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        {lang === "id" ? "Tidak ada alat tersedia." : "No equipment available."}
                                    </div>
                                ) : (
                                    Object.entries(groupedEquipment).map(([category, items]) => (
                                        <div key={category} className="space-y-3">
                                            <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-1">
                                                <span className="w-8 h-px bg-muted-foreground/30"></span>
                                                {category}
                                                <span className="text-xs text-muted-foreground font-normal ml-auto">
                                                    {items.length} item
                                                </span>
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {items.map(eq => {
                                                    const isChecked = (mapping[selectedUserId] || []).includes(eq.id);

                                                    // Check if taken by someone else
                                                    const takenByOtherId = Object.entries(mapping).find(([uid, eqIds]) =>
                                                        uid !== selectedUserId && eqIds.includes(eq.id)
                                                    )?.[0];
                                                    const takenByUser = takenByOtherId ? users.find(u => u.id === takenByOtherId) : null;

                                                    return (
                                                        <div
                                                            key={eq.id}
                                                            onClick={() => !takenByUser && toggleEquipment(eq.id)}
                                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isChecked
                                                                ? "border-primary bg-primary/5 shadow-sm"
                                                                : takenByUser
                                                                    ? "border-dashed border-muted-foreground/30 bg-muted/20 cursor-not-allowed opacity-70"
                                                                    : "border-border hover:border-primary/40 bg-background cursor-pointer"
                                                                }`}
                                                        >
                                                            <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${isChecked
                                                                ? "bg-primary border-primary"
                                                                : takenByUser
                                                                    ? "bg-muted border-muted-foreground/20"
                                                                    : "border-2 border-muted-foreground/30"
                                                                }`}>
                                                                {isChecked && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                                                                {takenByUser && <X className="w-3 h-3 text-muted-foreground" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className={`text-sm font-medium leading-tight ${isChecked ? "text-primary" : "text-foreground"}`}>
                                                                        {eq.name}
                                                                    </p>
                                                                    {takenByUser && (
                                                                        <span className="text-[9px] bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-tight whitespace-nowrap">
                                                                            {lang === "id" ? `DIAMBIL: ${takenByUser.full_name?.split(' ')[0] || 'STAF'}` : `TAKEN: ${takenByUser.full_name?.split(' ')[0] || 'STAFF'}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {eq.serial_number && (
                                                                    <p className="text-[11px] text-muted-foreground mt-1 font-mono bg-muted inline-block px-1.5 py-0.5 rounded">
                                                                        SN: {eq.serial_number}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-background flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium border hover:bg-muted transition-colors"
                    >
                        {lang === "id" ? "Batal" : "Cancel"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {saving ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {lang === "id" ? "Simpan Alat" : "Save Equipment"}
                    </button>
                </div>
            </div>
        </div>
    );
}
