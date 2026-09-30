"use client";

import { useSyncExternalStore } from "react";

export type NotificationPermissionState =
  /** Server render / before hydration: nothing is known yet. */
  | "unknown"
  /** Page isn't served over HTTPS (or localhost): the API is off-limits. */
  | "insecure"
  /** Browser has no Notification API (e.g. iOS Safari outside a PWA). */
  | "unsupported"
  | NotificationPermission;

export type AdminNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

const SW_URL = "/admin-sw.js";

// `Notification.requestPermission()` resolving doesn't fire any event the
// subscribers below would see, so it pokes them by hand.
const listeners = new Set<() => void>();

function readPermission(): NotificationPermissionState {
  if (!window.isSecureContext) return "insecure";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Unblocking in the browser's site settings happens outside the page.
  // The Permissions API reports it live where supported; focus/visibility
  // cover the rest (Safari), since the admin has to come back to the tab.
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  let status: PermissionStatus | undefined;
  let cancelled = false;
  navigator.permissions
    ?.query({ name: "notifications" })
    .then((s) => {
      if (cancelled) return;
      status = s;
      status.addEventListener("change", onChange);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    listeners.delete(onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
    status?.removeEventListener("change", onChange);
  };
}

export function useNotificationPermission(): NotificationPermissionState {
  return useSyncExternalStore(subscribe, readPermission, () => "unknown");
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const current = readPermission();
  if (current === "insecure" || current === "unsupported") return current;
  try {
    await Notification.requestPermission();
  } catch {
    // Old Safari only supports the callback form; it still updates
    // `Notification.permission`, which is what gets read below.
  }
  for (const listener of listeners) listener();
  return readPermission();
}

export function registerAdminServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register(SW_URL, { scope: "/", updateViaCache: "none" })
    .catch(() => {});
}

export async function showAdminNotification(
  payload: AdminNotificationPayload,
  onClick: (url: string) => void
): Promise<void> {
  if (readPermission() !== "granted") return;
  const options: NotificationOptions = {
    body: payload.body,
    tag: payload.tag,
    icon: "/favicon.ico",
    data: { url: payload.url },
  };
  try {
    // Right after the panel loads the worker may still be installing. Wait
    // for it briefly rather than falling back at once: the fallback throws
    // on Android Chrome. `ready` never settles if registration failed.
    const registration = await Promise.race([
      navigator.serviceWorker?.ready,
      new Promise<undefined>((resolve) => setTimeout(resolve, 3000)),
    ]);
    if (registration?.active) {
      await registration.showNotification(payload.title, options);
      return;
    }
  } catch {
    // Fall through to the page-level constructor.
  }
  try {
    const notification = new Notification(payload.title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick(payload.url);
    };
  } catch {
    // Android Chrome forbids the constructor; without a service worker
    // there's nothing else to try.
  }
}
