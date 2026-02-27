// ─── Still Photo Team Calendar — Service Worker ───────────────────────────────
// Handles: Web Push notifications, notification clicks, PWA install lifecycle.

const CACHE_NAME = "stillphoto-v1";

// ── Install: cache shell assets ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/offline.html"]);
    })
  );
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

// ── Activate: claim all clients ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Still Photo Calendar", body: event.data.text() };
  }

  const title = payload.title || "Still Photo Calendar";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-96.png",
    vibrate: [150, 80, 150],
    tag: payload.tag || "stillphoto-notif",      // replace same-tag notifications
    renotify: payload.renotify ?? true,
    data: {
      url: payload.url || "/",
      taskId: payload.taskId || null,
    },
    actions: payload.actions || [],
    // Show even if the app tab is in the foreground
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: focus or open the app ─────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ── Notification close (optional analytics hook) ──────────────────────────────
self.addEventListener("notificationclose", (_event) => {
  // Could log dismissed notifications here if needed
});

// ── Fetch: network-first strategy for API, cache-first for static ─────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept: API routes, Supabase, Telegram, external requests
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname
  ) {
    return; // let the browser handle it normally
  }

  // For same-origin navigation requests: network first, fallback to cache or offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match("/offline.html");
        })
      )
    );
    return;
  }

  // For static assets (js, css, images): stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || networkFetch;
        }),
      ),
    );
  }
});
