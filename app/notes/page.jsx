"use client";

import NotesView from "@/app/components/NotesView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";

export default function NotesPage() {
    const { session, userProfile, language } = useGlobalContext();
    const lang = language || "en";

    return (
        <PageContainer title={lang === "id" ? "Catatan" : "Notes"} hideAddButton={true}>
            <NotesView session={session} userProfile={userProfile} />
        </PageContainer>
    );
}
