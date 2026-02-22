import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// ── POST /api/push-subscribe — save subscription ─────────────────────────────

export async function POST(request) {
  try {
    const { userId, subscription } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("profiles")
      .update({
        push_subscription: subscription,
        notif_push: true,
      })
      .eq("id", userId);

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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("profiles")
      .update({
        push_subscription: null,
        notif_push: false,
      })
      .eq("id", userId);

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
