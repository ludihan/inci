"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  registerAdminServiceWorker,
  showAdminNotification,
  type AdminNotificationPayload,
} from "@/components/use-admin-notifications";
import { isAdminOpenTarget } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n";

// Notifications are built on the server without knowing the admin's language
// (see notifyAdminsOfRequesterActivity): point them at this tab's.
function withLocale(path: string, lang: Locale): string {
  return path.replace(/^\/(pt|en)\//, `/${lang}/`);
}

const SESSION_CHANNEL = "admin-session";
const OPEN_ATTEMPTS_KEY = "admin-open-attempts";
const OPEN_ATTEMPTS_WINDOW_MS = 10_000;
const OPEN_ATTEMPTS_MAX = 2;

// Opening `?abrir=` pushes the ticket route; if that route fails on the
// server, Next falls back to a full page load of /admin/tickets/<id>, which
// redirects right back here — a reload loop that a ref can't see, since each
// round is a new document. Count attempts per target in sessionStorage and
// give up after a retry.
function claimOpenAttempt(target: string): boolean {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(OPEN_ATTEMPTS_KEY);
    const last = raw ? (JSON.parse(raw) as { target: string; at: number; count: number }) : null;
    const count =
      last && last.target === target && now - last.at < OPEN_ATTEMPTS_WINDOW_MS
        ? last.count + 1
        : 1;
    sessionStorage.setItem(
      OPEN_ATTEMPTS_KEY,
      JSON.stringify({ target, at: count === 1 ? now : last!.at, count })
    );
    return count <= OPEN_ATTEMPTS_MAX;
  } catch {
    // Storage blocked: no loop protection, but still open the ticket.
    return true;
  }
}

// Logging out only clears the cookie; other admin tabs keep their SSE stream
// open (it was authenticated when it connected) and would go on receiving
// notifications with ticket contents. Tell them to drop it.
export function announceAdminLogout(): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(SESSION_CHANNEL);
  channel.postMessage("logout");
  channel.close();
}

type ServerNotification = {
  kind: "new" | "message" | "closed" | "reopened";
  ticketId: string;
  ticketType: "it" | "maintenance";
  criticality: "critica" | "urgente" | "medio" | "baixo";
  requesterName: string;
  excerpt: string;
  url: string;
  tag: string;
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

export type AdminLiveLabels = {
  notifications: Dict["admin"]["notifications"];
  ticketTypes: { it: string; maintenance: string };
  criticality: Dict["ticket"]["criticality"];
};

function toPayload(n: ServerNotification, labels: AdminLiveLabels): AdminNotificationPayload {
  const values = {
    id: n.ticketId,
    name: n.requesterName,
    excerpt: n.excerpt,
    type: labels.ticketTypes[n.ticketType],
    criticality: labels.criticality[n.criticality],
  };
  const t = labels.notifications;
  const title =
    n.kind === "new"
      ? t.newTicketTitle
      : n.kind === "closed"
        ? t.closedTitle
        : n.kind === "reopened"
          ? t.reopenedTitle
          : t.messageTitle;
  return {
    title: fill(title, values),
    body: fill(n.kind === "new" ? t.newTicketBody : t.activityBody, values),
    url: n.url,
    tag: n.tag,
  };
}

export function AdminLiveUpdates({
  lang,
  labels,
}: {
  lang: Locale;
  labels: AdminLiveLabels;
}) {
  // Read inside the stream listener without reconnecting when they change.
  const labelsRef = useRef(labels);
  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pathname = usePathname();
  const openTarget = useSearchParams().get("abrir");
  const openedRef = useRef<{ target: string; at: number } | null>(null);

  // Notifications and links from outside the list point at the list with the
  // real target in `?abrir=` (see notifyAdminsOfRequesterActivity and the
  // ticket detail page): a ticket only opens as a modal when pushed from the
  // list — so only act there (right after a login this component also
  // renders around the login page, whose URL can carry the same param).
  // Drop the param first so closing the modal (router.back) returns to the
  // clean list rather than re-opening it.
  useEffect(() => {
    if (!openTarget || pathname !== `/${lang}/admin/tickets`) return;
    // Strict Mode runs this twice for the same render; a second push of the
    // same intercepted route while the first is in flight makes Next
    // request a malformed "(.)(.)" route and fall back to the list.
    const last = openedRef.current;
    if (last && last.target === openTarget && Date.now() - last.at < 1000) return;
    openedRef.current = { target: openTarget, at: Date.now() };
    const params = new URLSearchParams(window.location.search);
    params.delete("abrir");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
    if (isAdminOpenTarget(openTarget) && claimOpenAttempt(openTarget)) {
      router.push(openTarget);
    }
  }, [openTarget, pathname, router, lang]);

  useEffect(() => {
    registerAdminServiceWorker();

    // Already on the list or on a ticket's modal, the ticket route is
    // intercepted directly. Going through `/admin/tickets?abrir=` from a
    // modal would be a partial navigation that keeps the old modal in the
    // slot, so closing the new one would show the old one over the list.
    const openNotificationUrl = (href: string) => {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const param = url.searchParams.get("abrir") ?? undefined;
      const target = isAdminOpenTarget(param) ? withLocale(param, lang) : undefined;
      const here = window.location.pathname;
      const tickets = `/${lang}/admin/tickets`;
      if (target && (here === tickets || here.startsWith(`${tickets}/`))) {
        router.push(target);
      } else if (target) {
        router.push(`${tickets}?abrir=${encodeURIComponent(target)}`);
      } else {
        router.push(withLocale(url.pathname, lang) + url.search);
      }
    };

    // Clicks on notifications shown by the service worker land here when an
    // admin tab is already open.
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "admin-notification-click") return;
      openNotificationUrl(String(event.data.url));
    };
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);

    const source = new EventSource("/api/admin/events/stream");

    const session =
      typeof BroadcastChannel === "undefined"
        ? undefined
        : new BroadcastChannel(SESSION_CHANNEL);
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    session?.addEventListener("message", (event) => {
      if (event.data !== "logout") return;
      source.close();
      // The message is sent as the logout starts, before its response clears
      // the cookie; reloading right away could still find a session. Once it
      // is gone the reload lands on the login page.
      reloadTimer = setTimeout(() => window.location.reload(), 1000);
    });

    source.addEventListener("admin-changed", () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), 200);
    });

    source.addEventListener("notification", (event) => {
      let payload: AdminNotificationPayload;
      try {
        payload = toPayload(
          JSON.parse((event as MessageEvent<string>).data) as ServerNotification,
          labelsRef.current
        );
      } catch {
        return;
      }
      void showAdminNotification(payload, openNotificationUrl);
    });

    return () => {
      clearTimeout(debounceRef.current);
      source.close();
      session?.close();
      clearTimeout(reloadTimer);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
    };
  }, [router, lang]);

  return null;
}
