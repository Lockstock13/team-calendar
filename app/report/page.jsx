"use client";

import ReportView from "@/app/components/ReportView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ReportPage() {
    const { tasks, users, language, appSettings } = useGlobalContext();
    const lang = language || "en";
    const router = useRouter();

    useEffect(() => {
        if (appSettings && appSettings.enable_report === false) {
            router.replace("/dashboard");
        }
    }, [appSettings, router]);

    if (appSettings && appSettings.enable_report === false) {
        return null;
    }

    return (
        <PageContainer title={lang === "id" ? "Laporan Bulanan" : "Monthly Report"} hideAddButton={true}>
            <ReportView tasks={tasks} users={users} />
        </PageContainer>
    );
}
