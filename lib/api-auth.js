import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getServiceClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export function getUserScopedClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function requireAuthUser(request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return {
      error: jsonError("Unauthorized - missing Bearer token", 401),
    };
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser(accessToken);

  if (error || !user) {
    return {
      error: jsonError("Unauthorized - invalid or expired token", 401),
    };
  }

  return {
    user,
    accessToken,
    userClient: getUserScopedClient(accessToken),
  };
}

export async function requireAdmin(request) {
  const auth = await requireAuthUser(request);
  if (auth.error) return auth;

  const { user, userClient, accessToken } = auth;
  const { data: profile, error } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "admin") {
    return { error: jsonError("Forbidden - admin only", 403) };
  }

  return { user, userClient, accessToken };
}

