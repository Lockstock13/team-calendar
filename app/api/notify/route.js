import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Server-side only — token tidak expose ke client
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram send error:", err);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { task, assigneeIds, actorName, action } = body;

    if (!task || !assigneeIds?.length) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Pakai service role untuk baca telegram_chat_id
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // Ambil telegram_chat_id dari fotografer yang di-assign
    const { data: assignees } = await supabase
      .from("profiles")
      .select("full_name, email, telegram_chat_id")
      .in("id", assigneeIds);

    if (!assignees?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // Format pesan
    const typeLabel =
      task.task_type === "libur_pengganti"
        ? "🏖️ Libur Pengganti"
        : task.task_type === "weekend"
          ? "🌙 Weekend"
          : "📅 Regular";

    const actionLabel =
      action === "created" ? "Jadwal Baru" : "Jadwal Diupdate";

    const names = assignees.map((a) => a.full_name || a.email).join(", ");

    const message =
      `<b>📸 ${actionLabel}</b>\n\n` +
      `<b>${task.title}</b>\n` +
      `${typeLabel}\n\n` +
      `📅 <b>Tanggal:</b> ${formatDate(task.start_date)}${task.end_date && task.end_date !== task.start_date ? ` – ${formatDate(task.end_date)}` : ""}\n` +
      `👥 <b>Tim:</b> ${names}\n` +
      (task.description ? `📝 <b>Catatan:</b> ${task.description}\n` : "") +
      `\n<i>Ditambahkan oleh ${actorName}</i>`;

    // Kirim ke tiap fotografer yang punya telegram_chat_id
    let sent = 0;
    for (const assignee of assignees) {
      if (assignee.telegram_chat_id) {
        await sendMessage(assignee.telegram_chat_id, message);
        sent++;
      }
    }

    // Juga kirim ke group jika ada TELEGRAM_CHAT_ID di env
    const groupChatId = process.env.TELEGRAM_CHAT_ID;
    if (groupChatId) {
      await sendMessage(groupChatId, message);
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
