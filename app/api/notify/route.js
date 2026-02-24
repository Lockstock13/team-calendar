import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { sendTaskEmail } from "@/lib/email";

// ─── Telegram helper ──────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegram(chatId, text) {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("[notify] Telegram error:", err.message);
    return false;
  }
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── POST /api/notify ─────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const { task, assigneeIds, actorName, action } = body;

    if (!task || !assigneeIds?.length) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // ── Fetch assignee profiles (for telegram/email — personal notifs) ────────
    const { data: assignees } = await supabase
      .from("profiles")
      .select("*")
      .in("id", assigneeIds);

    // ── Fetch ALL active members (for PWA push broadcast) ─────────────────────
    const { data: allMembers, error: membersError } = await supabase
      .from("profiles")
      .select("*")
      .neq("is_active", false);

    if (membersError) {
      console.error("[notify] members fetch error:", membersError.message);
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 },
      );
    }

    // ── Build shared content ──────────────────────────────────────────────────

    const typeLabel =
      task.task_type === "libur_pengganti"
        ? "🏖️ Libur Pengganti"
        : task.task_type === "weekend"
          ? "🌙 Weekend"
          : "📅 Regular";

    const actionLabel =
      action === "created" ? "Jadwal Baru" : "Jadwal Diupdate";

    const assigneeNames = (assignees || [])
      .map((a) => a.full_name || a.email)
      .join(", ");

    const dateRange =
      task.end_date && task.end_date !== task.start_date
        ? `${formatDate(task.start_date)} – ${formatDate(task.end_date)}`
        : formatDate(task.start_date);

    // ── PWA Push payload (broadcast ke semua member) ──────────────────────────

    const pushPayload = {
      title: `📸 ${actionLabel}`,
      body: `${task.title} · ${dateRange}${assigneeNames ? " · " + assigneeNames : ""}`,
      url: "/",
      tag: `task-${task.id || Date.now()}`,
      taskId: task.id || null,
    };

    const stats = { push: 0, telegram: 0, email: 0, pushExpired: [] };

    // Kirim PWA push ke SEMUA member aktif
    for (const member of allMembers || []) {
      if (member.notif_push === true && member.push_subscription) {
        const result = await sendPush(member.push_subscription, pushPayload);
        if (result.ok) {
          stats.push++;
        } else if (result.expired) {
          stats.pushExpired.push(member.id);
          await supabase
            .from("profiles")
            .update({ push_subscription: null, notif_push: false })
            .eq("id", member.id);
        }
      }
    }

    // ── Telegram & Email — hanya ke assignees (butuh .env, skip kalau belum) ──

    const telegramText =
      `<b>📸 ${actionLabel}</b>\n\n` +
      `<b>${task.title}</b>\n` +
      `${typeLabel}\n\n` +
      `📅 <b>Tanggal:</b> ${dateRange}\n` +
      `👥 <b>Tim:</b> ${assigneeNames || "-"}\n` +
      (task.description ? `📝 <b>Catatan:</b> ${task.description}\n` : "") +
      `\n<i>Oleh ${actorName}</i>`;

    for (const assignee of assignees || []) {
      const wantsTelegram = assignee.notif_telegram !== false;
      const wantsEmail = assignee.notif_email === true;

      if (wantsTelegram && assignee.telegram_chat_id) {
        const ok = await sendTelegram(assignee.telegram_chat_id, telegramText);
        if (ok) stats.telegram++;
      }

      if (wantsEmail && assignee.email) {
        const sent = await sendTaskEmail({
          to: assignee.email,
          recipientName: assignee.full_name || assignee.email,
          task,
          actorName,
          action,
        });
        if (sent) stats.email++;
      }
    }

    // Telegram group broadcast
    const groupChatId = process.env.TELEGRAM_CHAT_ID;
    if (groupChatId) {
      await sendTelegram(groupChatId, telegramText);
    }

    return NextResponse.json({ ok: true, sent: stats });
  } catch (err) {
    console.error("[notify] route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
