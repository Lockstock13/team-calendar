"use client";

import CalendarView from "@/app/components/CalendarView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";

export default function CalendarPage() {
    const { tasks, users, handleEditTask, handleDeleteTask, language, session } = useGlobalContext();
    const lang = language || "en";
    const currentUserId = session?.user?.id;

    return (
        <PageContainer title={lang === "id" ? "Kalender Jadwal" : "Schedule Calendar"}>
            <CalendarView
                tasks={tasks}
                users={users}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                currentUserId={currentUserId}
            />
        </PageContainer>
    );
}
