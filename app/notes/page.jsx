"use client";

import NotesView from "@/app/components/NotesView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotesPage() {
    const { session, userProfile, language, appSettings } = useGlobalContext();
    const lang = language || "en";
    const router = useRouter();

    useEffect(() => {
        if (appSettings && appSettings.enable_notes === false) {
            router.replace("/dashboard");
        }
    }, [appSettings, router]);

    if (appSettings && appSettings.enable_notes === false) {
        return null;
    }

    return (
        <PageContainer title={lang === "id" ? "Catatan" : "Notes"} hideAddButton={true}>
            <NotesView session={session} userProfile={userProfile} />
        </PageContainer>
    );
}
