"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { useGlobalContext } from "@/app/providers";
import Avatar from "@/app/components/Avatar";
import { ChatSkeleton } from "@/app/components/Skeletons";

// Kirim push notif chat ke semua member (fire & forget)
async function broadcastChatPush({ senderName, content, accessToken }) {
  fetch("/api/notify-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken || ""}`,
    },
    body: JSON.stringify({ senderName, content }),
  }).catch(() => {});
}

function DateDivider({ dateStr, lang }) {
  const d = new Date(dateStr);
  let label;
  if (isToday(d)) label = lang === "id" ? "Hari Ini" : "Today";
  else if (isYesterday(d)) label = lang === "id" ? "Kemarin" : "Yesterday";
  else
    label = format(d, "EEEE, d MMMM yyyy", {
      locale: lang === "id" ? id : enUS,
    });

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function MessageBubble({ msg, isMine, showAvatar, user, lang }) {
  const time = msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "";
  const animClass =
    "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both";

  if (isMine) {
    return (
      <div className={`flex flex-col items-end gap-0.5 mb-2 ${animClass}`}>
        <div className="flex items-end gap-2 group">
          {/* Timestamp — hover on desktop, hidden inline on mobile */}
          <span className="text-[10px] text-muted-foreground/80 sm:opacity-0 sm:group-hover:opacity-100 opacity-0 transition-opacity mb-1 hidden sm:block">
            {time}
          </span>
          <div
            className="max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl rounded-br-sm text-[13px] leading-relaxed break-words shadow-sm"
            style={{
              backgroundColor: user?.color || "#27272a",
              color: "#fff",
            }}
          >
            {msg.content}
          </div>
        </div>
        {/* Timestamp below bubble — mobile only */}
        <span className="text-[10px] text-muted-foreground/60 sm:hidden pr-1">
          {time}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-0.5 mb-2 ${animClass}`}>
      {showAvatar && (
        <span className="text-[11px] font-medium text-muted-foreground ml-10">
          {user?.full_name || user?.email?.split("@")[0] || "?"}
        </span>
      )}
      <div className="flex items-end gap-2 group">
        <div className="w-8 flex-shrink-0 flex items-end">
          {showAvatar ? (
            <Avatar user={user} size="md" />
          ) : (
            <div className="w-8" />
          )}
        </div>
        <div className="px-4 py-2.5 bg-background border border-border rounded-2xl rounded-bl-sm text-[13px] text-foreground leading-relaxed break-words shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] max-w-[75%] sm:max-w-[65%]">
          {msg.content}
        </div>
        {/* Timestamp — hover on desktop, hidden inline on mobile */}
        <span className="text-[10px] text-muted-foreground/80 sm:opacity-0 sm:group-hover:opacity-100 opacity-0 transition-opacity mb-1 hidden sm:block">
          {time}
        </span>
      </div>
      {/* Timestamp below bubble — mobile only */}
      <span className="text-[10px] text-muted-foreground/60 sm:hidden pl-10">
        {time}
      </span>
    </div>
  );
}

export default function ChatView({ session, userProfile, users }) {
  const { language } = useGlobalContext();
  const lang = language || "en";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const PAGE_SIZE = 50;

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // ── Fetch latest messages ──────────────────────────────────────────────────
  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (data) {
      const sorted = data.reverse(); // oldest first
      setMessages(sorted);
      setHasMore(data.length === PAGE_SIZE);
    }
  };

  // ── Load earlier messages ─────────────────────────────────────────────────
  const loadEarlier = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);

    const oldestTs = messages[0]?.created_at;
    const container = scrollContainerRef.current;
    const prevHeight = container?.scrollHeight || 0;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .lt("created_at", oldestTs)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (data && data.length > 0) {
      const older = data.reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.length === PAGE_SIZE);

      // Preserve scroll position
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    } else {
      setHasMore(false);
    }

    setLoadingMore(false);
  };

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages().then(() => {
      setLoading(false);
      setTimeout(() => scrollToBottom("instant"), 50);
    });

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => {
            // Hindari duplikat kalau optimistic sudah ada
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setTimeout(() => scrollToBottom(), 50);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    // Optimistic
    const optimistic = {
      id: `opt-${Date.now()}`,
      content,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(), 50);

    const { data, error } = await supabase
      .from("messages")
      .insert([{ content, user_id: session.user.id }])
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data : m)),
      );
      // Broadcast push notif ke semua member
      broadcastChatPush({
        senderName: userProfile?.full_name || session.user.email,
        content,
        accessToken: session.access_token,
      });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Group messages by date + show avatar logic ──────────────────────────────
  const grouped = [];
  let lastDate = null;
  let lastUserId = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const dateStr = msg.created_at
      ? msg.created_at.split("T")[0]
      : new Date().toISOString().split("T")[0];

    if (dateStr !== lastDate) {
      grouped.push({ type: "divider", dateStr, key: `div-${dateStr}` });
      lastDate = dateStr;
      lastUserId = null;
    }

    const showAvatar = msg.user_id !== lastUserId;
    grouped.push({ type: "message", msg, showAvatar, key: msg.id });
    lastUserId = msg.user_id;
  }

  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex flex-col bg-background/70 backdrop-blur-3xl border border-border rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[calc(100vh-148px)] sm:h-[calc(100vh-132px)] min-h-[420px]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-background/50 backdrop-blur-md border-b border-border flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-border flex items-center justify-center text-muted-foreground shadow-sm">
            <span className="text-sm sm:text-base">💬</span>
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-[15px] sm:text-[16px] text-foreground tracking-tight leading-none mb-1">
              {lang === "id" ? "Obrolan Tim" : "Team Chat"}
            </h2>
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="relative flex h-2 w-2 overflow-hidden rounded-full">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 pointer-events-none"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[11px] sm:text-[12px] text-muted-foreground font-medium">
                {lang === "id" ? "Sinkron real-time" : "Real-time sync"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex -space-x-2">
          {users.slice(0, 4).map((u) => (
            <div key={u.id} className="ring-2 ring-white rounded-full">
              <Avatar user={u} />
            </div>
          ))}
          {users.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-white dark:border-zinc-600 flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-2 ring-white dark:ring-zinc-600">
              +{users.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 scroll-smooth no-scrollbar relative"
      >
        {/* Load earlier button */}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadEarlier}
              disabled={loadingMore}
              className="text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-4 py-1.5 rounded-full transition-colors disabled:opacity-40 font-medium"
            >
              {loadingMore
                ? lang === "id"
                  ? "Memuat..."
                  : "Loading..."
                : lang === "id"
                  ? "⬆ Pesan sebelumnya"
                  : "⬆ Load earlier messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/80 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-border shadow-sm">
              <span className="text-2xl">💭</span>
            </div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {lang === "id"
                ? "Belum ada pesan. Sapa tim dulu."
                : "No messages yet. Say Hi!"}
            </p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "divider") {
            return (
              <DateDivider key={item.key} dateStr={item.dateStr} lang={lang} />
            );
          }
          const { msg, showAvatar } = item;
          const isMine = msg.user_id === session.user.id;
          const user = isMine
            ? userProfile
            : users.find((u) => u.id === msg.user_id);
          return (
            <MessageBubble
              key={item.key}
              msg={msg}
              isMine={isMine}
              showAvatar={showAvatar}
              user={user}
              lang={lang}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-background/60 backdrop-blur-md border-t border-border flex-shrink-0 z-10">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="hidden sm:block mb-[5px]">
            <Avatar user={userProfile} size="md" />
          </div>
          <div className="flex-1 flex items-end gap-2 bg-background border border-border focus-within:border-zinc-300 focus-within:shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] focus-within:ring-4 focus-within:ring-zinc-100/50 transition-all rounded-3xl px-4 py-2 sm:py-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                lang === "id" ? "Ketik pesan..." : "Type a message..."
              }
              maxLength={1000}
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none resize-none leading-relaxed max-h-32 no-scrollbar py-1"
              rows={1}
              style={{ minHeight: "28px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className={`p-2.5 rounded-full flex-shrink-0 self-end mb-[2px] shadow-sm transition-all duration-300 ${
                !input.trim() || sending
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed border border-border"
                  : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.05] active:scale-[0.95]"
              }`}
            >
              <Send className="w-4 h-4 ml-[1px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
