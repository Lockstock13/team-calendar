import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/webpush";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 30 });

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

async function getRequesterOrNull(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
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
      .select("id, is_active, full_name, email")
      .eq("id", requester.id)
      .single();

    if (!requesterProfile || requesterProfile.is_active === false) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const content = String(body?.content || "").trim();
    if (!content) return NextResponse.json({ ok: true, skipped: "empty-content" });
    if (content.length > 1000) {
      return NextResponse.json({ error: "Content too long" }, { status: 400 });
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: latestMessage } = await supabase
      .from("messages")
      .select("id, created_at")
      .eq("user_id", requester.id)
      .eq("content", content)
      .gte("created_at", twoMinutesAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestMessage) {
      return NextResponse.json({
        ok: true,
        skipped: "message-not-found-or-stale",
      });
    }

    const { data: members } = await supabase
      .from("profiles")
      .select("id, push_subscription, notif_push")
      .neq("is_active", false);

    if (!members?.length) return NextResponse.json({ ok: true });

    const senderName =
      requesterProfile.full_name || requesterProfile.email || "Team";
    const compactContent = content.replace(/\s+/g, " ").trim();
    const payload = {
      title: `[Chat] ${senderName}`,
      body:
        compactContent.length > 80
          ? compactContent.slice(0, 80) + "..."
          : compactContent,
      url: "/?view=chat",
      tag: "team-chat",
    };

    let sent = 0;
    for (const m of members) {
      if (m.notif_push === true && m.push_subscription) {
        const result = await sendPush(m.push_subscription, payload);
        if (result.ok) {
          sent++;
        } else if (result.expired) {
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
