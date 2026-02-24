import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId, requesterId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!requesterId) {
      return NextResponse.json(
        { error: "Missing requesterId" },
        { status: 400 },
      );
    }

    // Gunakan service role key agar bisa delete dari auth.users
    // Fallback ke anon key jika service role belum dikonfigurasi
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    // ── Verifikasi requester adalah admin ─────────────────────────────────────
    const { data: requester, error: requesterError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", requesterId)
      .single();

    if (requesterError || !requester) {
      return NextResponse.json(
        { error: "Requester tidak ditemukan" },
        { status: 403 },
      );
    }

    if (requester.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya admin yang bisa menghapus member." },
        { status: 403 },
      );
    }

    // ── Jangan hapus diri sendiri ─────────────────────────────────────────────
    if (userId === requesterId) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus akun sendiri." },
        { status: 400 },
      );
    }

    // ── Ambil info user yang akan dihapus (untuk logging) ─────────────────────
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", userId)
      .single();

    // Cegah hapus admin lain (opsional — aktifkan jika diperlukan)
    // if (targetUser?.role === "admin") {
    //   return NextResponse.json({ error: "Tidak bisa menghapus sesama admin." }, { status: 400 });
    // }

    // ── Hapus dari tabel profiles ─────────────────────────────────────────────
    // Pakai .select() agar kita tahu apakah baris benar-benar terhapus.
    // Kalau SUPABASE_SERVICE_ROLE_KEY tidak diset, anon key + RLS bisa
    // return success tapi 0 rows affected — kita tangkap di sini.
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
      return NextResponse.json(
        {
          error:
            "Hapus gagal — profil tidak ditemukan atau akses ditolak. Pastikan SUPABASE_SERVICE_ROLE_KEY sudah diset di environment variables.",
        },
        { status: 500 },
      );
    }

    // ── Hapus dari auth.users (butuh service role key) ────────────────────────
    let authDeleted = false;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        // Profil sudah terhapus, tapi auth user gagal dihapus.
        // Log saja, jangan rollback — user tidak bisa login tanpa profil.
        console.error("Auth user delete error:", authError.message);
      } else {
        authDeleted = true;
      }
    }

    console.log(
      `[delete-member] ${targetUser?.full_name || targetUser?.email || userId} dihapus oleh admin ${requesterId}. authDeleted=${authDeleted}`,
    );

    return NextResponse.json({
      ok: true,
      authDeleted,
      message: authDeleted
        ? "Member berhasil dihapus permanen."
        : "Profil dihapus. Auth user tidak dihapus (service role key tidak dikonfigurasi).",
    });
  } catch (err) {
    console.error("delete-member route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
