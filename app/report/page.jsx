"use client";

import ReportView from "@/app/components/ReportView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";

export default function ReportPage() {
    const { tasks, users, language } = useGlobalContext();
    const lang = language || "en";

    return (
        <PageContainer title={lang === "id" ? "Laporan Bulanan" : "Monthly Report"} hideAddButton={true}>
            <ReportView tasks={tasks} users={users} />
        </PageContainer>
    );
}
