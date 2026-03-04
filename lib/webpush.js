import webpush from "web-push";

// ─── VAPID init (runs once at module load, server-side only) ──────────────────

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@example.com";

let vapidReady = false;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
  } catch (err) {
    console.error("[webpush] VAPID init error:", err.message);
  }
} else {
  console.warn("[webpush] VAPID keys not configured — push notifications disabled.");
}

// ─── sendPush ─────────────────────────────────────────────────────────────────

/**
 * Send a Web Push notification to a single subscription.
 *
 * @param {object} subscription  - The push subscription object (stored in DB).
 * @param {object} payload       - Notification payload.
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} [payload.url]    - URL to open on click (default "/")
 * @param {string} [payload.tag]    - Notification tag (replaces same-tag notif)
 * @param {string} [payload.taskId] - Optional task id for deep-link
 *
 * @returns {{ ok: boolean, reason?: string, expired?: boolean }}
 */
export async function sendPush(subscription, payload) {
  if (!vapidReady) {
    return { ok: false, reason: "no-vapid-config" };
  }

  if (!subscription?.endpoint) {
    return { ok: false, reason: "invalid-subscription" };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title ?? "Still Photo Calendar",
        body: payload.body ?? "",
        url: payload.url ?? "/",
        tag: payload.tag ?? "stillphoto",
        taskId: payload.taskId ?? null,
        renotify: true,
      }),
    );
    return { ok: true };
  } catch (err) {
    // 410 Gone / 404 Not Found → subscription is no longer valid
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, reason: "expired", expired: true, statusCode: err.statusCode };
    }
    console.error("[webpush] sendNotification error:", err.message);
    return { ok: false, reason: err.message };
  }
}

export { vapidReady };
