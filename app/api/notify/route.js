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

    // Use service role so we can read all profile columns including push_subscription
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // Fetch all assignee profiles with notification prefs
    const { data: assignees } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, telegram_chat_id, push_subscription, notif_telegram, notif_push, notif_email",
      )
      .in("id", assigneeIds);

    if (!assignees?.length) {
      return NextResponse.json({ ok: true, sent: {} });
    }

    // ── Build shared message content ─────────────────────────────────────────

    const typeLabel =
      task.task_type === "libur_pengganti"
        ? "🏖️ Libur Pengganti"
        : task.task_type === "weekend"
          ? "🌙 Weekend"
          : "📅 Regular";

    const actionLabel =
      action === "created" ? "Jadwal Baru" : "Jadwal Diupdate";
    const names = assignees.map((a) => a.full_name || a.email).join(", ");

    const dateRange =
      task.end_date && task.end_date !== task.start_date
        ? `${formatDate(task.start_date)} – ${formatDate(task.end_date)}`
        : formatDate(task.start_date);

    // ── Telegram message ─────────────────────────────────────────────────────

    const telegramText =
      `<b>📸 ${actionLabel}</b>\n\n` +
      `<b>${task.title}</b>\n` +
      `${typeLabel}\n\n` +
      `📅 <b>Tanggal:</b> ${dateRange}\n` +
      `👥 <b>Tim:</b> ${names}\n` +
      (task.description ? `📝 <b>Catatan:</b> ${task.description}\n` : "") +
      `\n<i>Ditambahkan oleh ${actorName}</i>`;

    // ── Push notification payload ─────────────────────────────────────────────

    const pushPayload = {
      title: `📸 ${actionLabel}`,
      body: `${task.title} · ${dateRange}`,
      url: "/",
      tag: `task-${task.id || Date.now()}`,
      taskId: task.id || null,
    };

    // ── Send per-assignee ─────────────────────────────────────────────────────

    const stats = { telegram: 0, push: 0, email: 0, pushExpired: [] };

    for (const assignee of assignees) {
      const name = assignee.full_name || assignee.email;

      // notif_telegram defaults to true if column is null (backward compat)
      const wantsTelegram = assignee.notif_telegram !== false;
      const wantsPush = assignee.notif_push === true;
      const wantsEmail = assignee.notif_email === true;

      // Telegram
      if (wantsTelegram && assignee.telegram_chat_id) {
        const ok = await sendTelegram(assignee.telegram_chat_id, telegramText);
        if (ok) stats.telegram++;
      }

      // Web Push
      if (wantsPush && assignee.push_subscription) {
        const result = await sendPush(assignee.push_subscription, {
          ...pushPayload,
          body: `${task.title} · ${dateRange}`,
        });

        if (result.ok) {
          stats.push++;
        } else if (result.expired) {
          // Subscription has expired — clean it up so we don't retry
          stats.pushExpired.push(assignee.id);
          await supabase
            .from("profiles")
            .update({ push_subscription: null, notif_push: false })
            .eq("id", assignee.id);
        }
      }

      // Email
      if (wantsEmail && assignee.email) {
        const sent = await sendTaskEmail({
          to: assignee.email,
          recipientName: name,
          task,
          actorName,
          action,
        });
        if (sent) stats.email++;
      }
    }

    // ── Also send to Telegram group (if TELEGRAM_CHAT_ID is set) ─────────────

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
