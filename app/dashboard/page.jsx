"use client";

import DashboardView from "@/app/components/DashboardView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";

export default function DashboardPage() {
    const { tasks, users, session, language } = useGlobalContext();
    const lang = language || "en";

    return (
        <PageContainer title={lang === "id" ? "Dashboard" : "Dashboard"} hideAddButton={true}>
            <DashboardView tasks={tasks} users={users} currentUserId={session.user.id} />
        </PageContainer>
    );
}
