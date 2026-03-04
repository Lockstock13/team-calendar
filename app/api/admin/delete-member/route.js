import { NextResponse } from "next/server";
import { getServiceClient, requireAdmin } from "@/lib/api-auth";
import { rateLimitAsync } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(request) {
  try {
    const adminAuth = await requireAdmin(request);
    if (adminAuth.error) return adminAuth.error;

    const requesterId = adminAuth.user.id;
    const limiter = await rateLimitAsync(`admin-delete-member:${requesterId}`, {
      limit: 5,
      windowMs: 60 * 1000,
    });
    if (!limiter.ok) {
      await writeAuditLog({
        action: "admin.delete_member.rate_limited",
        actorId: requesterId,
        route: "/api/admin/delete-member",
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

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (userId === requesterId) {
      await writeAuditLog({
        action: "admin.delete_member.self_blocked",
        actorId: requesterId,
        targetId: userId,
        route: "/api/admin/delete-member",
        status: "blocked",
      });
      return NextResponse.json(
        { error: "Tidak bisa menghapus akun sendiri." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for delete-member endpoint.",
        },
        { status: 500 },
      );
    }

    const { data: targetUser } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", userId)
      .single();

    const { data: deleted, error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId)
      .select("id");

    if (profileError) {
      console.error("Profile delete error:", profileError);
      return NextResponse.json(
        { error: "Gagal menghapus profil: " + profileError.message },
        { status: 500 },
      );
    }

    if (!deleted || deleted.length === 0) {
      await writeAuditLog({
        action: "admin.delete_member.not_found",
        actorId: requesterId,
        targetId: userId,
        route: "/api/admin/delete-member",
        status: "error",
      });
      return NextResponse.json(
        { error: "Hapus gagal - profil tidak ditemukan." },
        { status: 404 },
      );
    }

    let authDeleted = false;
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Auth user delete error:", authError.message);
    } else {
      authDeleted = true;
    }

    console.log(
      `[delete-member] ${targetUser?.full_name || targetUser?.email || userId} dihapus oleh admin ${requesterId}. authDeleted=${authDeleted}`,
    );

    await writeAuditLog({
      action: "admin.delete_member",
      actorId: requesterId,
      targetId: userId,
      route: "/api/admin/delete-member",
      status: authDeleted ? "ok" : "partial",
      details: { auth_deleted: authDeleted },
    });

    return NextResponse.json({
      ok: true,
      authDeleted,
      message: authDeleted
        ? "Member berhasil dihapus permanen."
        : "Profil terhapus, tetapi auth user gagal dihapus. Cek server logs.",
    });
  } catch (err) {
    console.error("delete-member route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
