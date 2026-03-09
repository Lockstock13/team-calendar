"use client";

import ChatView from "@/app/components/ChatView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChatPage() {
  const { session, userProfile, users, language, appSettings } = useGlobalContext();
  const lang = language || "en";
  const router = useRouter();

  useEffect(() => {
    if (appSettings && appSettings.enable_chat === false) {
      router.replace("/dashboard");
    }
  }, [appSettings, router]);

  if (appSettings && appSettings.enable_chat === false) {
    return null; // Return null while redirecting
  }

  return (
    <PageContainer
      title={lang === "id" ? "Obrolan Tim" : "Team Chat"}
      hideAddButton={true}
    >
      <ChatView session={session} userProfile={userProfile} users={users} />
    </PageContainer>
  );
}
