"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirm } from "@/app/components/ConfirmProvider";

/**
 * Custom hook for task CRUD operations.
 * Extracted from providers.js to reduce its size and improve maintainability.
 */
export function useTaskActions({ session, userProfile, users, language }) {
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useToast();
    const { confirm } = useConfirm();
    const lang = language || "en";

    const handleTaskSubmit = async (formData) => {
        if (!session) {
            addToast(
                lang === "id" ? "Sesi habis, silakan refresh halaman." : "Session expired, please refresh.",
                "error",
            );
            return;
        }
        if (submitting) return;
        setSubmitting(true);

        const assigneeIds = formData.assignee_ids;
        const assigneeUsers = users.filter((u) => assigneeIds.includes(u.id));
        const assigneeNames = assigneeUsers
            .map((u) => u.full_name || u.email)
            .join(", ");

        const taskData = {
            title: formData.title,
            description: formData.description,
            start_date: formData.start_date,
            end_date: formData.end_date,
            priority: formData.priority || "medium",
            created_by: session.user.id,
            assignee_ids: assigneeIds,
            assigned_to_name: assigneeNames,
            status: editingTask?.status || "todo",
            is_weekend_task: false,
            is_comday: formData.task_type === "libur_pengganti",
            task_type: formData.task_type,
        };

        try {
            let error;
            if (editingTask) {
                ({ error } = await supabase
                    .from("tasks")
                    .update(taskData)
                    .eq("id", editingTask.id));
            } else {
                ({ error } = await supabase.from("tasks").insert([taskData]));
            }
            if (error) throw error;

            setShowForm(false);
            setEditingTask(null);
            addToast(
                editingTask
                    ? (lang === "id" ? "Jadwal berhasil diupdate ✓" : "Task updated ✓")
                    : (lang === "id" ? "Jadwal berhasil ditambahkan ✓" : "Task added ✓"),
                "success",
            );

            // Fire-and-forget notification
            fetch("/api/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task: taskData,
                    assigneeIds,
                    actorName: userProfile?.full_name || session.user.email,
                    action: editingTask ? "updated" : "created",
                }),
            }).catch(() => { });
        } catch (err) {
            addToast(
                (lang === "id" ? "Gagal menyimpan: " : "Failed to save: ") + err.message,
                "error",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setShowForm(true);
    };

    const handleDeleteTask = async (taskId) => {
        const ok = await confirm({
            title: lang === "id" ? "Hapus Jadwal" : "Delete Task",
            message: lang === "id"
                ? "Apakah kamu yakin ingin menghapus jadwal ini? Tindakan ini tidak bisa dibatalkan."
                : "Are you sure you want to delete this task? This cannot be undone.",
            confirmText: lang === "id" ? "Hapus" : "Delete",
            cancelText: lang === "id" ? "Batal" : "Cancel",
        });
        if (!ok) return;

        const { error } = await supabase.from("tasks").delete().eq("id", taskId);
        if (error) {
            addToast(
                (lang === "id" ? "Gagal menghapus: " : "Failed to delete: ") + error.message,
                "error",
            );
        } else {
            addToast(
                lang === "id" ? "Jadwal dihapus ✓" : "Task deleted ✓",
                "success",
            );
        }
    };

    const handleUpdateStatus = async (taskId, newStatus) => {
        const { error } = await supabase
            .from("tasks")
            .update({ status: newStatus })
            .eq("id", taskId);

        if (!error) {
            addToast(
                lang === "id" ? `Status → ${newStatus} ✓` : `Status → ${newStatus} ✓`,
                "success",
            );
        }
    };

    return {
        showForm,
        setShowForm,
        editingTask,
        setEditingTask,
        submitting,
        handleTaskSubmit,
        handleEditTask,
        handleDeleteTask,
        handleUpdateStatus,
    };
}
