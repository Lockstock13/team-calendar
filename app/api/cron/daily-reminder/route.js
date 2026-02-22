export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendDailyReminderEmail } from "@/lib/email";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// ─── Auth guard ───────────────────────────────────────────────────────────────
// Vercel Cron akan otomatis menambahkan header Authorization: Bearer <CRON_SECRET>
// ketika CRON_SECRET di-set di environment variables.

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  // Jika CRON_SECRET belum diset, allow (untuk dev/testing)
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// ─── GET /api/cron/daily-reminder ─────────────────────────────────────────────
// Schedule: "0 1 * * *" → 01:00 UTC = 08:00 WIB (UTC+7)

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // ── Tentukan tanggal "hari ini" dalam WIB ─────────────────────────────────
    // Cron jalan jam 01:00 UTC = 08:00 WIB hari yang sama, jadi UTC date = WIB date
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const dateLabel = format(
      new Date(todayStr + "T00:00:00"),
      "EEEE, d MMMM yyyy",
      { locale: id },
    );

    // ── Ambil semua task yang mulai hari ini ──────────────────────────────────
    const { data: todayTasks, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("start_date", todayStr)
      .neq("task_type", "libur_pengganti") // skip hari libur (tidak perlu diingatkan)
      .order("start_date", { ascending: true });

    if (taskError) {
      console.error("[cron] task fetch error:", taskError.message);
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    if (!todayTasks?.length) {
      console.log(`[cron] ${todayStr}: tidak ada jadwal hari ini.`);
      return NextResponse.json({
        ok: true,
        date: todayStr,
        tasks: 0,
        notified: 0,
      });
    }

    // ── Kumpulkan semua assignee IDs yang unik ────────────────────────────────
    const allAssigneeIds = [
      ...new Set(todayTasks.flatMap((t) => t.assignee_ids || [])),
    ];

    if (!allAssigneeIds.length) {
      return NextResponse.json({
        ok: true,
        date: todayStr,
        tasks: todayTasks.length,
        notified: 0,
      });
    }

    // ── Ambil profil semua assignee ───────────────────────────────────────────
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, telegram_chat_id, push_subscription, notif_telegram, notif_push, notif_email",
      )
      .in("id", allAssigneeIds)
      .neq("is_active", false);

    if (profileError) {
      console.error("[cron] profile fetch error:", profileError.message);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    if (!profiles?.length) {
      return NextResponse.json({
        ok: true,
        date: todayStr,
        tasks: todayTasks.length,
        notified: 0,
      });
    }

    // ── Kirim notifikasi per user ──────────────────────────────────────────────
    const stats = { telegram: 0, push: 0, email: 0, pushExpired: [] };
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    for (const profile of profiles) {
      // Jadwal milik user ini hari ini
      const userTasks = todayTasks.filter((t) =>
        (t.assignee_ids || []).includes(profile.id),
      );
      if (!userTasks.length) continue;

      const name = profile.full_name || profile.email || "Fotografer";

      // notif_telegram defaults true kalau belum pernah diset (backward compat)
      const wantsTelegram = profile.notif_telegram !== false;
      const wantsPush = profile.notif_push === true;
      const wantsEmail = profile.notif_email === true;

      // ── Telegram ─────────────────────────────────────────────────────────────
      if (wantsTelegram && profile.telegram_chat_id && BOT_TOKEN) {
        const taskLines = userTasks
          .map(
            (t) =>
              `• <b>${t.title}</b>${t.description ? ` — ${t.description}` : ""}`,
          )
          .join("\n");

        const msg =
          `☀️ <b>Pengingat Jadwal Hari Ini</b>\n` +
          `📅 ${dateLabel}\n\n` +
          `Halo <b>${name}</b>, kamu punya ${userTasks.length} jadwal hari ini:\n\n` +
          taskLines;

        try {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: profile.telegram_chat_id,
              text: msg,
              parse_mode: "HTML",
            }),
          });
          stats.telegram++;
        } catch (err) {
          console.error("[cron] Telegram error:", err.message);
        }
      }

      // ── Web Push ──────────────────────────────────────────────────────────────
      if (wantsPush && profile.push_subscription) {
        const taskSummary =
          userTasks.length === 1
            ? userTasks[0].title
            : `${userTasks.length} jadwal — ${userTasks.map((t) => t.title).join(", ")}`;

        const result = await sendPush(profile.push_subscription, {
          title: `☀️ Jadwal Hari Ini — ${dateLabel}`,
          body: taskSummary,
          url: "/",
          tag: `daily-${todayStr}`,
        });

        if (result.ok) {
          stats.push++;
        } else if (result.expired) {
          stats.pushExpired.push(profile.id);
          // Hapus subscription yang sudah expired
          await supabase
            .from("profiles")
            .update({ push_subscription: null, notif_push: false })
            .eq("id", profile.id);
        }
      }

      // ── Email ─────────────────────────────────────────────────────────────────
      if (wantsEmail && profile.email) {
        const sent = await sendDailyReminderEmail({
          to: profile.email,
          recipientName: name,
          tasks: userTasks,
          dateLabel,
        });
        if (sent) stats.email++;
      }
    }

    // ── Kirim summary ke Telegram group (jika ada) ────────────────────────────
    const groupChatId = process.env.TELEGRAM_CHAT_ID;
    if (groupChatId && BOT_TOKEN) {
      const allLines = todayTasks
        .map((t) => `• <b>${t.title}</b> — ${t.assigned_to_name || "-"}`)
        .join("\n");

      const groupMsg =
        `☀️ <b>Jadwal Hari Ini</b> — ${dateLabel}\n\n` +
        `${todayTasks.length} jadwal aktif:\n\n` +
        allLines;

      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: groupChatId,
            text: groupMsg,
            parse_mode: "HTML",
          }),
        });
      } catch (err) {
        console.error("[cron] group Telegram error:", err.message);
      }
    }

    console.log(
      `[cron] ${todayStr}: ${todayTasks.length} tasks, notified — telegram:${stats.telegram} push:${stats.push} email:${stats.email}`,
    );

    return NextResponse.json({
      ok: true,
      date: todayStr,
      tasks: todayTasks.length,
      notified: stats,
    });
  } catch (err) {
    console.error("[cron] daily-reminder error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
