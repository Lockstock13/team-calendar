"use client";

import dynamic from "next/dynamic";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";

const CalendarView = dynamic(() => import("@/app/components/CalendarView"), {
  ssr: false,
  loading: () => (
    <div className="py-10 text-sm text-muted-foreground">Loading calendar…</div>
  ),
});

export default function CalendarPage() {
  const { tasks, users, handleEditTask, handleDeleteTask, language } =
    useGlobalContext();
  const lang = language || "en";

  return (
    <PageContainer
      title={lang === "id" ? "Kalender Jadwal" : "Schedule Calendar"}
    >
      <CalendarView
        tasks={tasks}
        users={users}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
      />
    </PageContainer>
  );
}
