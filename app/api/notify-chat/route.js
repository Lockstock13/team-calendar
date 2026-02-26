import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 30 });

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { success } = limiter.check(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { senderName, content } = await request.json();
    if (!content) return NextResponse.json({ ok: true });

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

    const payload = {
      title: `💬 ${senderName || "Tim"}`,
      body: content.length > 80 ? content.slice(0, 80) + "…" : content,
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

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[notify-chat] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
