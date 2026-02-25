"use client";

import ChatView from "@/app/components/ChatView";
import PageContainer from "@/app/components/PageContainer";
import { useGlobalContext } from "@/app/providers";

export default function ChatPage() {
    const { session, userProfile, users } = useGlobalContext();

    return (
        <PageContainer title="Team Chat" hideAddButton={true}>
            <ChatView session={session} userProfile={userProfile} users={users} />
        </PageContainer>
    );
}
