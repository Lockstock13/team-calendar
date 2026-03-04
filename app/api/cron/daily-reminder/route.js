export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { sendDailyReminderEmail } from "@/lib/email";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// ─── Auth guard ───────────────────────────────────────────────────────────────
// Kalau CRON_SECRET tidak diset → allow semua (termasuk browser test)
// Kalau CRON_SECRET diset → harus ada header Authorization: Bearer <secret>

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// ─── GET /api/cron/daily-reminder ─────────────────────────────────────────────
// Vercel schedule: "0 23 * * *" → 23:00 UTC = 06:00 WIB
// Test manual: buka URL langsung di browser

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized — set CRON_SECRET di env vars" },
      { status: 401 },
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // ── Tanggal hari ini dalam WIB (UTC+7) ───────────────────────────────────
    // PENTING: server jalan di UTC. Cron jam 23:00 UTC = 06:00 WIB hari berikutnya.
    // Kalau pakai now.toISOString() langsung → dapat tanggal UTC (kemarin) → tasks tidak ketemu.
    // Fix: tambah 7 jam ke UTC biar dapat tanggal WIB yang benar.
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = wibNow.toISOString().split("T")[0];
    const debug = {
      utc_now: now.toISOString(),
      wib_now: wibNow.toISOString(),
      querying_date: todayStr,
    };
    const dateLabel = format(
      new Date(todayStr + "T00:00:00"),
      "EEEE, d MMMM yyyy",
      { locale: id },
    );

    // ── Ambil semua jadwal hari ini (kecuali libur pengganti) ─────────────────
    const { data: todayTasks, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, start_date, assigned_to_name, task_type")
      .eq("start_date", todayStr)
      .neq("task_type", "libur_pengganti")
      .order("title", { ascending: true });

    if (taskError) {
      console.error("[cron] task fetch error:", taskError.message);
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // ── Ambil SEMUA member aktif ──────────────────────────────────────────────
    const { data: allMembers, error: memberError } = await supabase
      .from("profiles")
      .select("*")
      .neq("is_active", false);

    if (memberError) {
      console.error("[cron] member fetch error:", memberError.message);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!allMembers?.length) {
      return NextResponse.json({
        ok: true,
        date: todayStr,
        tasks: todayTasks?.length ?? 0,
        notified: 0,
      });
    }

    const stats = { push: 0, telegram: 0, email: 0, pushExpired: [] };
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    // ── Tidak ada jadwal hari ini ─────────────────────────────────────────────
    if (!todayTasks?.length) {
      console.log(`[cron] ${todayStr}: tidak ada jadwal hari ini.`);

      // Ambil semua tasks tanpa filter tanggal untuk debug
      const { data: allTasksSample } = await supabase
        .from("tasks")
        .select("id, title, start_date, task_type")
        .order("start_date", { ascending: false })
        .limit(5);

      console.log(`[cron] debug — 5 tasks terbaru:`, allTasksSample);

      // Kirim notif "tidak ada jadwal" ke semua member
      const emptyPayload = {
        title: `☀️ ${dateLabel}`,
        body: "Tidak ada jadwal hari ini. Selamat istirahat! 🎉",
        url: "/",
        tag: `daily-${todayStr}`,
      };

      for (const member of allMembers) {
        if (member.notif_push === true && member.push_subscription) {
          const result = await sendPush(member.push_subscription, emptyPayload);
          if (result.ok) stats.push++;
          else if (result.expired) {
            stats.pushExpired.push(member.id);
            await supabase
              .from("profiles")
              .update({ push_subscription: null, notif_push: false })
              .eq("id", member.id);
          }
        }
      }

      return NextResponse.json({
        ok: true,
        date: todayStr,
        tasks: 0,
        notified: stats,
        debug,
        recent_tasks_in_db: allTasksSample?.map((t) => ({
          title: t.title,
          start_date: t.start_date,
          task_type: t.task_type,
        })),
      });
    }

    // ── Format daftar jadwal untuk notif ──────────────────────────────────────
    const taskLines = todayTasks
      .map((t) => {
        const assignee = t.assigned_to_name ? ` · ${t.assigned_to_name}` : "";
        const note = t.description ? ` (${t.description})` : "";
        return `• ${t.title}${assignee}${note}`;
      })
      .join("\n");

    const taskLinesTelegram = todayTasks
      .map((t) => {
        const assignee = t.assigned_to_name
          ? ` · <i>${t.assigned_to_name}</i>`
          : "";
        const note = t.description ? `\n  📝 ${t.description}` : "";
        return `• <b>${t.title}</b>${assignee}${note}`;
      })
      .join("\n");

    const pushBody = todayTasks
      .map(
        (t) =>
          `${t.title}${t.assigned_to_name ? " · " + t.assigned_to_name : ""}`,
      )
      .join(" | ");

    // ── Kirim ke setiap member aktif ──────────────────────────────────────────
    for (const member of allMembers) {
      const name = member.full_name || member.email || "Tim";
      const wantsPush = member.notif_push === true;
      const wantsTelegram = member.notif_telegram !== false;
      const wantsEmail = member.notif_email === true;

      // Web Push
      if (wantsPush && member.push_subscription) {
        const result = await sendPush(member.push_subscription, {
          title: `☀️ Jadwal Hari Ini — ${dateLabel}`,
          body: pushBody,
          url: "/",
          tag: `daily-${todayStr}`,
        });

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

      // Telegram personal
      if (wantsTelegram && member.telegram_chat_id && BOT_TOKEN) {
        const msg =
          `☀️ <b>Jadwal Hari Ini</b>\n` +
          `📅 ${dateLabel}\n\n` +
          `Halo <b>${name}</b>! Berikut jadwal tim hari ini:\n\n` +
          taskLinesTelegram;

        try {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: member.telegram_chat_id,
              text: msg,
              parse_mode: "HTML",
            }),
          });
          stats.telegram++;
        } catch (err) {
          console.error("[cron] Telegram personal error:", err.message);
        }
      }

      // Email
      if (wantsEmail && member.email) {
        const sent = await sendDailyReminderEmail({
          to: member.email,
          recipientName: name,
          tasks: todayTasks,
          dateLabel,
        });
        if (sent) stats.email++;
      }
    }

    // ── Telegram group broadcast ──────────────────────────────────────────────
    const groupChatId = process.env.TELEGRAM_CHAT_ID;
    if (groupChatId && BOT_TOKEN) {
      const groupMsg =
        `☀️ <b>Jadwal Hari Ini</b> — ${dateLabel}\n\n` +
        `${todayTasks.length} jadwal:\n\n` +
        taskLinesTelegram;

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
        console.error("[cron] Telegram group error:", err.message);
      }
    }

    console.log(
      `[cron] ${todayStr}: ${todayTasks.length} tasks → push:${stats.push} telegram:${stats.telegram} email:${stats.email}`,
    );

    return NextResponse.json({
      ok: true,
      date: todayStr,
      utc_now: new Date().toISOString(),
      wib_now: wibNow.toISOString(),
      tasks: todayTasks.length,
      task_list: todayTasks.map((t) => ({
        title: t.title,
        date: t.start_date,
        assignee: t.assigned_to_name,
      })),
      members: allMembers.length,
      notified: stats,
    });
  } catch (err) {
    console.error("[cron] daily-reminder error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
