import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

async function getRequesterOrNull(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// ── POST /api/push-subscribe — save subscription ─────────────────────────────

export async function POST(request) {
  try {
    const { subscription } = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const requester = await getRequesterOrNull(supabase, request);
    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        push_subscription: subscription,
        notif_push: true,
      })
      .eq("id", requester.id);

    if (error) {
      console.error("[push-subscribe] save error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push-subscribe] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/push-subscribe — remove subscription ─────────────────────────

export async function DELETE(request) {
  try {
    const supabase = getSupabase();
    const requester = await getRequesterOrNull(supabase, request);
    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        push_subscription: null,
        notif_push: false,
      })
      .eq("id", requester.id);

    if (error) {
      console.error("[push-subscribe] remove error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push-subscribe] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
