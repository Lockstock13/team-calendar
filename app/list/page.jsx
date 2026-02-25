"use client";

import ListView from "@/app/components/ListView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";
import { useState } from "react";

export default function ListPage() {
    const { tasks, users, handleEditTask, handleDeleteTask, handleUpdateTaskStatus, language } = useGlobalContext();
    const lang = language || "en";
    const [filterUserId, setFilterUserId] = useState("");

    return (
        <PageContainer title={lang === "id" ? "Semua Jadwal" : "All Tasks"}>
            <ListView
                tasks={tasks}
                users={users}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onUpdateStatus={handleUpdateTaskStatus}
                filterUserId={filterUserId}
            />
        </PageContainer>
    );
}
