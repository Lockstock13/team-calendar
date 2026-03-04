import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";

// ── POST /api/push-subscribe — save subscription ─────────────────────────────

export async function POST(request) {
  try {
    const auth = await requireAuthUser(request);
    if (auth.error) return auth.error;

    const { subscription } = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 },
      );
    }

    const { error } = await auth.userClient
      .from("profiles")
      .update({
        push_subscription: subscription,
        notif_push: true,
      })
      .eq("id", auth.user.id);

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
    const auth = await requireAuthUser(request);
    if (auth.error) return auth.error;

    const { error } = await auth.userClient
      .from("profiles")
      .update({
        push_subscription: null,
        notif_push: false,
      })
      .eq("id", auth.user.id);

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
