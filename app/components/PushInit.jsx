"use client";

import { useEffect } from "react";

// Re-export the VAPID public key so other client components can import it
// without needing process.env directly (which requires NEXT_PUBLIC_ prefix).
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Converts a URL-safe base64 string to a Uint8Array.
 * Required by pushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Checks whether this browser / device supports Web Push.
 * Returns an object describing support and any blocking reason.
 */
export function getPushSupport() {
  if (typeof window === "undefined") {
    return { supported: false, reason: "ssr" };
  }
  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "no-sw" };
  }
  if (!("PushManager" in window)) {
    return { supported: false, reason: "no-push" };
  }
  if (!("Notification" in window)) {
    return { supported: false, reason: "no-notification" };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { supported: false, reason: "no-vapid-key" };
  }
  return { supported: true };
}

/**
 * Returns a human-readable message for unsupported push reasons.
 */
export function getPushUnsupportedLabel(reason) {
  const map = {
    "no-sw": "Browser tidak mendukung Service Worker",
    "no-push": "Browser tidak mendukung Push Notification",
    "no-notification": "Browser tidak mendukung Notification API",
    "no-vapid-key": "VAPID key belum dikonfigurasi",
    ssr: "Tidak tersedia di server",
  };
  return map[reason] || "Tidak didukung";
}

/**
 * PushInit — mounted once in layout.
 * Registers /sw.js silently; does NOT request notification permission here.
 * Permission is requested only when the user explicitly enables push in Profile.
 */
export default function PushInit() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const isProd = process.env.NODE_ENV === "production";

    // In development, disable SW completely to prevent stale Next.js chunks.
    if (!isProd) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }

    // Register the service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates periodically
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New SW is ready — could show a "refresh for update" banner here
                console.log("[SW] New version available.");
              }
            });
          }
        });
      })
      .catch((err) => {
        // Non-fatal — app works without SW, just no push/offline support
        console.warn("[SW] Registration failed:", err.message);
      });
  }, []);

  // This component renders nothing
  return null;
}
