"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirm } from "@/app/components/ConfirmProvider";

/**
 * Custom hook for task CRUD operations.
 * Extracted from providers.js to reduce its size and improve maintainability.
 */
export function useTaskActions({
  session,
  userProfile,
  users,
  language,
  onSuccess,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const lang = language || "en";

  const handleTaskSubmit = async (formData) => {
    if (!session) {
      addToast(
        lang === "id"
          ? "Sesi habis, silakan refresh halaman."
          : "Session expired, please refresh.",
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

    const addDays = (dateStr, days) => {
      const d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    };

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
      is_recurring: formData.is_recurring || false,
      recurrence_id: editingTask?.recurrence_id || null,
    };

    try {
      let error;
      let savedTask = null;
      let tasksToInsert = null;
      let insertedTasksData = null;
      if (editingTask) {
        const { data, error: updateError } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id)
          .select("*")
          .single();
        error = updateError;
        savedTask = data;
      } else if (formData.is_recurring && formData.recurring_until) {
        // HANDLE RECURRENCE
        const tasksToInsert = [];
        const recurrenceId = crypto.randomUUID();

        let currentStart = formData.start_date;
        let currentEnd = formData.end_date || formData.start_date;

        // Calculate duration in days
        const startD = new Date(currentStart + "T00:00:00");
        const endD = new Date(currentEnd + "T00:00:00");
        const durationDays = Math.round(
          (endD - startD) / (1000 * 60 * 60 * 24),
        );

        while (currentStart <= formData.recurring_until) {
          tasksToInsert.push({
            ...taskData,
            start_date: currentStart,
            end_date: currentEnd,
            recurrence_id: recurrenceId,
            is_recurring: true,
          });

          // Move to next week
          currentStart = addDays(currentStart, 7);
          currentEnd = addDays(currentStart, durationDays);
        }

        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert(tasksToInsert)
          .select("id");
        error = insertError;
        insertedTasksData = data; // store all created tasks
        savedTask = data?.[0] || null;
      } else {
        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert([taskData])
          .select("*")
          .single();
        error = insertError;
        savedTask = data;
      }
      if (error) throw error;

      setShowForm(false);
      setEditingTask(null);
      addToast(
        editingTask
          ? lang === "id"
            ? "Jadwal berhasil diupdate ✓"
            : "Task updated ✓"
          : lang === "id"
            ? "Jadwal berhasil ditambahkan ✓"
            : "Task added ✓",
        "success",
      );
      if (onSuccess) onSuccess();

      // Fire-and-forget notification
      if (savedTask?.id) {
        fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            taskId: savedTask.id,
            action: editingTask ? "updated" : "created",
          }),
        }).catch(() => { });
      }
    } catch (err) {
      addToast(
        (lang === "id" ? "Gagal menyimpan: " : "Failed to save: ") +
        err.message,
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

  const handleDeleteTask = async (taskOrId) => {
    const task = typeof taskOrId === "object" ? taskOrId : null;
    const taskId = task?.id || taskOrId;
    const recurrenceId = task?.recurrence_id;

    let choice = true;
    let deleteType = "single";

    if (recurrenceId) {
      deleteType = await confirm({
        title:
          lang === "id" ? "Hapus Jadwal Berulang" : "Delete Recurring Task",
        message:
          lang === "id"
            ? "Tentukan bagaimana kamu ingin menghapus jadwal ini."
            : "Choose how you want to delete this task.",
        buttons: [
          { label: lang === "id" ? "Batal" : "Cancel", value: "cancel" },
          {
            label: lang === "id" ? "Yang Ini Saja" : "Just This One",
            value: "single",
            variant: "danger",
          },
          {
            label: lang === "id" ? "Semua Jadwal Berulang" : "All Linked Tasks",
            value: "all",
            variant: "danger",
          },
        ],
      });
      if (deleteType === "cancel" || !deleteType) return;
      choice = true;
    } else {
      choice = await confirm({
        title: lang === "id" ? "Hapus Jadwal" : "Delete Task",
        message:
          lang === "id"
            ? "Apakah kamu yakin ingin menghapus jadwal ini? Tindakan ini tidak bisa dibatalkan."
            : "Are you sure you want to delete this task? This cannot be undone.",
        confirmText: lang === "id" ? "Hapus" : "Delete",
        cancelText: lang === "id" ? "Batal" : "Cancel",
      });
    }

    if (!choice) return;

    let query = supabase.from("tasks").delete();
    if (deleteType === "all" && recurrenceId) {
      query = query.eq("recurrence_id", recurrenceId);
    } else {
      query = query.eq("id", taskId);
    }

    const { error } = await query;
    if (error) {
      addToast(
        (lang === "id" ? "Gagal menghapus: " : "Failed to delete: ") +
        error.message,
        "error",
      );
    } else {
      addToast(
        lang === "id" ? "Jadwal dihapus ✓" : "Task deleted ✓",
        "success",
      );
      if (onSuccess) onSuccess();
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
      if (onSuccess) onSuccess();
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
