export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { sendDailyReminderEmail } from "@/lib/email";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function getLocalDateTimeParts(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );

  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    time: `${lookup.hour}:${lookup.minute}`,
  };
}

function parseHHmmToMinutes(value) {
  const [h, m] = String(value || "").split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function shouldRunNow({
  nowTime,
  targetTime,
  lastSentDate,
  todayDate,
  windowMinutes = 10,
}) {
  if (lastSentDate === todayDate) return false;
  const nowMinutes = parseHHmmToMinutes(nowTime);
  const targetMinutes = parseHHmmToMinutes(targetTime);
  if (nowMinutes === null || targetMinutes === null) return false;
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + windowMinutes;
}

function normalizeHHmm(value) {
  if (!value) return "06:00";
  return String(value).slice(0, 5);
}

function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

    const { data: appSettings } = await supabase
      .from("app_settings")
      .select(
        "id, daily_reminder_enabled, daily_reminder_time, daily_reminder_timezone, daily_reminder_last_sent_date",
      )
      .single();

    const reminderEnabled = appSettings?.daily_reminder_enabled !== false;
    const reminderTime = normalizeHHmm(appSettings?.daily_reminder_time);
    const reminderTimezone =
      appSettings?.daily_reminder_timezone || "Asia/Jakarta";
    const lastSentDate = appSettings?.daily_reminder_last_sent_date || null;

    const localNow = getLocalDateTimeParts(reminderTimezone);
    const runNow = reminderEnabled
      ? shouldRunNow({
          nowTime: localNow.time,
          targetTime: reminderTime,
          lastSentDate,
          todayDate: localNow.date,
        })
      : false;

    if (!runNow) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: reminderEnabled
          ? "not-scheduled-window-or-already-sent"
          : "reminder-disabled",
        schedule: {
          enabled: reminderEnabled,
          time: reminderTime,
          timezone: reminderTimezone,
          last_sent_date: lastSentDate,
        },
        now: localNow,
      });
    }

    const todayStr = localNow.date;
    const dateLabel = format(
      new Date(todayStr + "T00:00:00"),
      "EEEE, d MMMM yyyy",
      { locale: id },
    );

    const { data: todayTasks, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, description, start_date, assigned_to_name, task_type")
      .eq("start_date", todayStr)
      .neq("task_type", "libur_pengganti")
      .order("title", { ascending: true });

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    const { data: allMembers, error: memberError } = await supabase
      .from("profiles")
      .select("*")
      .neq("is_active", false);

    if (memberError) {
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!todayTasks?.length) {
      const emptyPayload = {
        title: `Jadwal ${dateLabel}`,
        body: "Tidak ada jadwal hari ini.",
        url: "/",
        tag: `daily-${todayStr}`,
      };

      for (const member of allMembers) {
        if (member.notif_push === true && member.push_subscription) {
          const result = await sendPush(member.push_subscription, emptyPayload);
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

      if (appSettings?.id) {
        await supabase
          .from("app_settings")
          .update({ daily_reminder_last_sent_date: todayStr })
          .eq("id", appSettings.id);
      }

      return NextResponse.json({
        ok: true,
        date: todayStr,
        tasks: 0,
        notified: stats,
      });
    }

    const taskLinesTelegram = todayTasks
      .map((t) => {
        const assignee = t.assigned_to_name
          ? ` - <i>${escapeTelegramHtml(t.assigned_to_name)}</i>`
          : "";
        const note = t.description
          ? `\n  Catatan: ${escapeTelegramHtml(t.description)}`
          : "";
        return `- <b>${escapeTelegramHtml(t.title)}</b>${assignee}${note}`;
      })
      .join("\n");

    const pushBody = todayTasks
      .map(
        (t) =>
          `${t.title}${t.assigned_to_name ? " - " + t.assigned_to_name : ""}`,
      )
      .join(" | ");

    for (const member of allMembers) {
      const name = member.full_name || member.email || "Tim";
      const wantsPush = member.notif_push === true;
      const wantsTelegram = member.notif_telegram !== false;
      const wantsEmail = member.notif_email === true;

      if (wantsPush && member.push_subscription) {
        const result = await sendPush(member.push_subscription, {
          title: `Jadwal Hari Ini - ${dateLabel}`,
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

      if (wantsTelegram && member.telegram_chat_id && botToken) {
        const msg =
          `<b>Jadwal Hari Ini</b>\n` +
          `${escapeTelegramHtml(dateLabel)}\n\n` +
          `Halo <b>${escapeTelegramHtml(name)}</b>, berikut jadwal tim hari ini:\n\n` +
          taskLinesTelegram;

        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: member.telegram_chat_id,
              text: msg,
              parse_mode: "HTML",
            }),
          });
          stats.telegram++;
        } catch (_err) {}
      }

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

    const groupChatId = process.env.TELEGRAM_CHAT_ID;
    if (groupChatId && botToken) {
      const groupMsg =
        `<b>Jadwal Hari Ini</b> - ${escapeTelegramHtml(dateLabel)}\n\n` +
        `${todayTasks.length} jadwal:\n\n` +
        taskLinesTelegram;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: groupChatId,
            text: groupMsg,
            parse_mode: "HTML",
          }),
        });
      } catch (_err) {}
    }

    if (appSettings?.id) {
      await supabase
        .from("app_settings")
        .update({ daily_reminder_last_sent_date: todayStr })
        .eq("id", appSettings.id);
    }

    return NextResponse.json({
      ok: true,
      date: todayStr,
      schedule: {
        enabled: reminderEnabled,
        time: reminderTime,
        timezone: reminderTimezone,
      },
      tasks: todayTasks.length,
      members: allMembers.length,
      notified: stats,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
