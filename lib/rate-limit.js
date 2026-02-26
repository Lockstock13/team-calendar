/**
 * Simple in-memory rate limiter for API routes.
 * Limits requests by IP address within a sliding window.
 *
 * Usage in API route:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500, limit: 10 });
 *
 *   export async function POST(request) {
 *     const ip = request.headers.get("x-forwarded-for") || "unknown";
 *     const { success } = limiter.check(ip);
 *     if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *     ...
 *   }
 */

export function rateLimit({ interval = 60_000, limit = 10 } = {}) {
    const tokens = new Map(); // ip -> { count, resetAt }

    // Cleanup old entries periodically
    const cleanup = () => {
        const now = Date.now();
        for (const [key, val] of tokens) {
            if (now > val.resetAt) tokens.delete(key);
        }
    };

    // Run cleanup every interval
    if (typeof setInterval !== "undefined") {
        setInterval(cleanup, interval);
    }

    return {
        check(token) {
            const now = Date.now();
            const entry = tokens.get(token);

            if (!entry || now > entry.resetAt) {
                tokens.set(token, { count: 1, resetAt: now + interval });
                return { success: true, remaining: limit - 1 };
            }

            entry.count++;

            if (entry.count > limit) {
                return { success: false, remaining: 0 };
            }

            return { success: true, remaining: limit - entry.count };
        },
    };
}
