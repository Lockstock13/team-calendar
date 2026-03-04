const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 10;
const MAX_ENTRIES = 5000;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function getStore() {
  const g = globalThis;
  if (!g.__appRateLimitStore) {
    g.__appRateLimitStore = new Map();
  }
  return g.__appRateLimitStore;
}

function pruneStore(store, now) {
  for (const [k, entry] of store) {
    if (entry.resetAt <= now) store.delete(k);
  }
  if (store.size <= MAX_ENTRIES) return;

  const sorted = [...store.entries()].sort(
    (a, b) => a[1].resetAt - b[1].resetAt,
  );
  const toDelete = store.size - MAX_ENTRIES;
  for (let i = 0; i < toDelete; i++) {
    store.delete(sorted[i][0]);
  }
}

export function rateLimit(key, { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {}) {
  const now = Date.now();
  const store = getStore();
  pruneStore(store, now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

function parseUpstashResult(payload, index = 0) {
  const item = payload?.[index];
  if (!item) return null;
  if (typeof item?.result !== "undefined") return item.result;
  if (Array.isArray(item) && item.length > 1) return item[1];
  return null;
}

function hasRedisConfig() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function upstashRequest(path, body = null) {
  const url = `${REDIS_URL}${path}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Upstash error ${res.status}`);
  }
  return res.json();
}

async function redisRateLimit(
  key,
  { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {},
) {
  const redisKey = `rl:${key}`;
  const pipeline = await upstashRequest("/pipeline", [
    ["INCR", redisKey],
    ["PTTL", redisKey],
  ]);

  const countRaw = parseUpstashResult(pipeline, 0);
  const ttlRaw = parseUpstashResult(pipeline, 1);

  const count = Number(countRaw || 0);
  let ttlMs = Number(ttlRaw || -1);

  if (count <= 1 || ttlMs < 0) {
    await upstashRequest(`/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`);
    ttlMs = windowMs;
  }

  if (count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)),
      source: "redis",
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - count),
    retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)),
    source: "redis",
  };
}

export async function rateLimitAsync(
  key,
  { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {},
) {
  if (hasRedisConfig()) {
    try {
      return await redisRateLimit(key, { limit, windowMs });
    } catch (err) {
      console.warn("[rate-limit] Redis unavailable, fallback to memory:", err.message);
    }
  }

  return {
    ...rateLimit(key, { limit, windowMs }),
    source: "memory",
  };
}
