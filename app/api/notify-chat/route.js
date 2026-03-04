import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { requireAuthUser } from "@/lib/api-auth";
import { rateLimitAsync } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(request) {
  try {
    const auth = await requireAuthUser(request);
    if (auth.error) return auth.error;
    const limiter = await rateLimitAsync(`notify-chat:${auth.user.id}`, {
      limit: 20,
      windowMs: 60 * 1000,
    });
    if (!limiter.ok) {
      await writeAuditLog({
        action: "notify_chat.rate_limited",
        actorId: auth.user.id,
        route: "/api/notify-chat",
        status: "blocked",
        details: { retry_after_sec: limiter.retryAfterSec },
      });
      const res = NextResponse.json(
        { error: "Too many requests. Please retry later." },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(limiter.retryAfterSec));
      return res;
    }

    const { content } = await request.json();
    if (!content || typeof content !== "string")
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });

    const text = content.trim();
    if (!text) return NextResponse.json({ ok: true });
    if (text.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 chars)" },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const { data: members } = await supabase
      .from("profiles")
      .select("id, push_subscription, notif_push")
      .neq("is_active", false);

    if (!members?.length) return NextResponse.json({ ok: true });

    const actor =
      (
        await auth.userClient
          .from("profiles")
          .select("full_name, email")
          .eq("id", auth.user.id)
          .single()
      ).data || null;
    const senderName = actor?.full_name || actor?.email || auth.user.email;

    const payload = {
      title: `💬 ${senderName || "Tim"}`,
      body: text.length > 80 ? text.slice(0, 80) + "…" : text,
      url: "/?view=chat",
      tag: "team-chat",
    };

    let sent = 0;
    for (const m of members) {
      if (m.notif_push === true && m.push_subscription) {
        const result = await sendPush(m.push_subscription, payload);
        if (result.ok) sent++;
        else if (result.expired) {
          await supabase
            .from("profiles")
            .update({ push_subscription: null, notif_push: false })
            .eq("id", m.id);
        }
      }
    }

    await writeAuditLog({
      action: "notify_chat.sent",
      actorId: auth.user.id,
      route: "/api/notify-chat",
      status: "ok",
      details: { sent, preview: text.slice(0, 80) },
    });

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[notify-chat] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
