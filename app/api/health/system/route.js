import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function toBool(value) {
  return Boolean(value && String(value).trim().length > 0);
}

function authorized(request) {
  const secret = process.env.HEALTHCHECK_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

function getRateLimitBackend() {
  if (
    toBool(process.env.UPSTASH_REDIS_REST_URL) &&
    toBool(process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return "redis";
  }
  return "memory";
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const checks = {
    database: {
      ok: false,
      error: null,
      latency_ms: null,
    },
    config: {
      supabase_url: toBool(supabaseUrl),
      supabase_service_role_key: toBool(serviceKey),
      supabase_anon_key: toBool(anonKey),
      vapid_public: toBool(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      vapid_private: toBool(process.env.VAPID_PRIVATE_KEY),
      smtp_host: toBool(process.env.SMTP_HOST),
      smtp_user: toBool(process.env.SMTP_USER),
      telegram_bot_token: toBool(process.env.TELEGRAM_BOT_TOKEN),
      cron_secret: toBool(process.env.CRON_SECRET),
      healthcheck_secret: toBool(process.env.HEALTHCHECK_SECRET),
      rate_limit_backend: getRateLimitBackend(),
    },
  };

  try {
    const t0 = Date.now();
    const key = serviceKey || anonKey;
    if (!supabaseUrl || !key) {
      throw new Error("Supabase URL/key not configured");
    }

    const supabase = createClient(supabaseUrl, key);
    const { error } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    checks.database.latency_ms = Date.now() - t0;
    if (error) throw error;
    checks.database.ok = true;
  } catch (err) {
    checks.database.ok = false;
    checks.database.error = err?.message || "Unknown DB error";
  }

  const healthy = checks.database.ok;
  const payload = {
    ok: healthy,
    status: healthy ? "healthy" : "degraded",
    checked_at: new Date().toISOString(),
    elapsed_ms: Date.now() - startedAt,
    checks,
  };

  return NextResponse.json(payload, { status: healthy ? 200 : 503 });
}

