import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { sendTaskEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 20 });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

function firstForwardedIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeAction(action) {
  return action === "updated" ? "updated" : "created";
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

async function getRequesterOrNull(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

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

async function handleAdminTestBroadcast({ supabase, requesterProfile }) {
  if (requesterProfile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: allMembers, error: membersError } = await supabase
    .from("profiles")
    .select("id, notif_push, push_subscription")
    .neq("is_active", false);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const stats = { push: 0, telegram: 0, email: 0, pushExpired: [] };
  const payload = {
    title: "Test Notification",
    body: "This is a test push sent from admin panel.",
    url: "/",
    tag: `test-${Date.now()}`,
    taskId: null,
  };

  for (const member of allMembers || []) {
    if (member.notif_push === true && member.push_subscription) {
      const result = await sendPush(member.push_subscription, payload);
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

  return NextResponse.json({ ok: true, sent: stats });
}

export async function POST(request) {
  try {
    const { success } = limiter.check(firstForwardedIp(request));
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const requester = await getRequesterOrNull(supabase, request);
    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("id, is_active, role, full_name, email")
      .eq("id", requester.id)
      .single();

    if (!requesterProfile || requesterProfile.is_active === false) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body?.mode === "test") {
      return await handleAdminTestBroadcast({ supabase, requesterProfile });
    }

    const taskId = body?.taskId;
    const action = normalizeAction(body?.action);
    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, description, start_date, end_date, task_type, assignee_ids, assigned_to_name, created_by",
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAdmin = requesterProfile.role === "admin";
    const isCreator = task.created_by && task.created_by === requester.id;
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assigneeIds = Array.isArray(task.assignee_ids) ? task.assignee_ids : [];
    if (!assigneeIds.length) {
      return NextResponse.json({ error: "Task has no assignees" }, { status: 400 });
    }

    const { data: assignees } = await supabase
      .from("profiles")
      .select("*")
      .in("id", assigneeIds);

    const { data: allMembers, error: membersError } = await supabase
      .from("profiles")
      .select("*")
      .neq("is_active", false);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const typeLabel =
      task.task_type === "libur_pengganti"
        ? "Replacement Leave"
        : task.task_type === "weekend"
          ? "Weekend"
          : "Regular";
    const actionLabel =
      action === "created" ? "New Schedule" : "Schedule Updated";
    const assigneeNames = (assignees || [])
      .map((a) => a.full_name || a.email)
      .join(", ");
    const dateRange =
      task.end_date && task.end_date !== task.start_date
        ? `${formatDate(task.start_date)} - ${formatDate(task.end_date)}`
        : formatDate(task.start_date);

    const pushPayload = {
      title: `[Task] ${actionLabel}`,
      body: `${task.title} - ${dateRange}${assigneeNames ? " - " + assigneeNames : ""}`,
      url: "/",
      tag: `task-${task.id}`,
      taskId: task.id,
    };

    const stats = { push: 0, telegram: 0, email: 0, pushExpired: [] };
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

    const actorName =
      requesterProfile.full_name || requesterProfile.email || requester.email;
    const telegramText =
      `<b>${escapeTelegramHtml(actionLabel)}</b>\n\n` +
      `<b>${escapeTelegramHtml(task.title)}</b>\n` +
      `${escapeTelegramHtml(typeLabel)}\n\n` +
      `<b>Date:</b> ${escapeTelegramHtml(dateRange)}\n` +
      `<b>Team:</b> ${escapeTelegramHtml(assigneeNames || "-")}\n` +
      (task.description
        ? `<b>Notes:</b> ${escapeTelegramHtml(task.description)}\n`
        : "") +
      `\n<i>By ${escapeTelegramHtml(actorName)}</i>`;

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
