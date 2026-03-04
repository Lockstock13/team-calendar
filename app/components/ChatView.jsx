"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import { Send } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";
import Avatar from "./Avatar";

const DateDivider = memo(function DateDivider({ dateStr }) {
  const d = new Date(dateStr);
  let label;
  if (isToday(d)) label = "Hari Ini";
  else if (isYesterday(d)) label = "Kemarin";
  else label = format(d, "EEEE, d MMMM yyyy", { locale: id });

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({ msg, isMine, showAvatar, user }) {
  const time = msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "";

  if (isMine) {
    return (
      <div className="flex flex-col items-end gap-0.5 mb-1">
        {showAvatar && (
          <span className="text-xs text-muted-foreground mr-1 mb-0.5">
            Kamu
          </span>
        )}
        <div className="flex items-end gap-2">
          <span className="text-xs text-muted-foreground flex-shrink-0 mb-0.5">
            {time}
          </span>
          <div
            className="max-w-[70%] px-3.5 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed break-words"
            style={{
              backgroundColor: user?.color || "#3b82f6",
              color: "#fff",
            }}
          >
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-1">
      <div className="w-7 flex-shrink-0">
        {showAvatar && <Avatar user={user} />}
      </div>
      <div className="flex flex-col gap-0.5 max-w-[70%]">
        {showAvatar && (
          <span className="text-xs text-muted-foreground ml-1">
            {user?.full_name || user?.email?.split("@")[0] || "?"}
          </span>
        )}
        <div className="flex items-end gap-2">
          <div className="px-3.5 py-2 bg-muted rounded-2xl rounded-bl-sm text-sm leading-relaxed break-words">
            {msg.content}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 mb-0.5">
            {time}
          </span>
        </div>
      </div>
    </div>
  );
});

export default function ChatView({ session, userProfile, users }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  const broadcastChatPush = (content) => {
    fetch("/api/notify-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ content }),
    }).catch(() => { });
  };

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages(data);
  };

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages().then(() => {
      setLoading(false);
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
      broadcastChatPush(content);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(content);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // Auto-scroll reliably whenever messages change using robust effect
  useEffect(() => {
    // Gunakan requestAnimationFrame agar DOM benar-benar sudah update sebelum scroll
    requestAnimationFrame(() => {
      scrollToBottom(messages.length <= 200 ? "smooth" : "instant");
    });
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Group messages by date + show avatar logic (memoized) ──────────────────
  const grouped = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastUserId = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const dateStr = msg.created_at
        ? msg.created_at.split("T")[0]
        : new Date().toISOString().split("T")[0];

      if (dateStr !== lastDate) {
        result.push({ type: "divider", dateStr, key: `div-${dateStr}` });
        lastDate = dateStr;
        lastUserId = null;
      }

      const showAvatar = msg.user_id !== lastUserId;
      result.push({ type: "message", msg, showAvatar, key: msg.id });
      lastUserId = msg.user_id;
    }
    return result;
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-background border rounded-2xl overflow-hidden chat-container"
      style={{ minHeight: "400px" }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <h2 className="font-semibold text-sm">Team Chat</h2>
        </div>
        <div className="flex -space-x-2">
          {users.slice(0, 5).map((u) => (
            <Avatar key={u.id} user={u} />
          ))}
          {users.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
              +{users.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <span className="text-4xl mb-3">💬</span>
            <p className="text-sm">Belum ada pesan. Mulai chat!</p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "divider") {
            return <DateDivider key={item.key} dateStr={item.dateStr} />;
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
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t flex-shrink-0">
        <div className="flex items-end gap-2">
          <Avatar user={userProfile} />
          <div className="flex-1 flex items-end gap-2 bg-muted/50 border rounded-2xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan... (Enter untuk kirim)"
              className="flex-1 bg-transparent text-sm focus:outline-none resize-none leading-relaxed max-h-24"
              rows={1}
              style={{ minHeight: "24px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-1.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 transition-opacity hover:opacity-90 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 ml-9">
          Enter kirim · Shift+Enter baris baru
        </p>
      </div>
    </div>
  );
}
