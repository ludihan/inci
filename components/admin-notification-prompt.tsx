"use client";

import { useEffect, useState } from "react";
import {
  requestNotificationPermission,
  showAdminNotification,
  type NotificationPermissionState,
} from "@/components/use-admin-notifications";
import type { Dict, Locale } from "@/lib/i18n";

type Labels = Dict["admin"]["notifications"];

const BELL = "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0";
const BELL_OFF =
  "M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20";

function BellIcon({ off, className = "h-4 w-4" }: { off?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={off ? BELL_OFF : BELL} />
    </svg>
  );
}

function statusFor(
  permission: Exclude<NotificationPermissionState, "unknown">,
  labels: Labels
): { label: string; dot: string } {
  switch (permission) {
    case "granted":
      return { label: labels.on, dot: "bg-emerald-500" };
    case "default":
      return { label: labels.off, dot: "bg-amber-500" };
    case "denied":
      return { label: labels.blocked, dot: "bg-red-600" };
    default:
      return { label: labels.unavailable, dot: "bg-zinc-400" };
  }
}

function sendTestNotification(labels: Labels, lang: Locale): void {
  void showAdminNotification(
    {
      title: labels.testTitle,
      body: labels.testBody,
      url: `/${lang}/admin`,
      tag: "admin-notifications-test",
    },
    () => {}
  );
}

/**
 * Sidebar row showing the current state. When notifications are on it sends
 * a test one — the browser can allow them while the OS (Windows focus
 * assist, macOS settings) still hides them, and this is how to find out.
 * Otherwise it reopens the banner.
 */
export function AdminNotificationStatus({
  permission,
  labels,
  lang,
  onClick,
}: {
  permission: NotificationPermissionState;
  labels: Labels;
  lang: Locale;
  onClick: () => void;
}) {
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!testSent) return;
    const timer = setTimeout(() => setTestSent(false), 4000);
    return () => clearTimeout(timer);
  }, [testSent]);

  if (permission === "unknown") return null;
  const status = statusFor(permission, labels);
  const granted = permission === "granted";
  return (
    <button
      type="button"
      onClick={() => {
        if (!granted) return onClick();
        sendTestNotification(labels, lang);
        setTestSent(true);
      }}
      title={granted ? labels.sendTest : undefined}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
    >
      <span className="relative shrink-0">
        <BellIcon off={permission !== "granted"} className="h-4 w-4 opacity-70" />
        <span
          className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${status.dot}`}
        />
      </span>
      <span className="truncate" aria-live="polite">
        {granted && testSent ? labels.testSent : status.label}
      </span>
    </button>
  );
}

export function AdminNotificationBanner({
  permission,
  labels,
  lang,
  onDismiss,
}: {
  permission: NotificationPermissionState;
  labels: Labels;
  lang: Locale;
  onDismiss: () => void;
}) {
  const [pending, setPending] = useState(false);
  // Set when a retry after blocking came back still denied: the browser
  // won't prompt again, so the admin has to go through its settings.
  const [retryFailed, setRetryFailed] = useState(false);
  // Set when the request came back undecided: the prompt was closed, or the
  // browser suppressed it (Chrome's quiet UI after repeated dismissals).
  const [promptIgnored, setPromptIgnored] = useState(false);

  if (permission === "unknown" || permission === "granted") return null;

  const request = async () => {
    setPending(true);
    const result = await requestNotificationPermission();
    setPending(false);
    if (result === "granted") {
      sendTestNotification(labels, lang);
    } else if (result === "denied") {
      setRetryFailed(true);
    } else if (result === "default") {
      setPromptIgnored(true);
    }
  };

  const dismiss = (
    <button
      type="button"
      onClick={onDismiss}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
    >
      {permission === "default" ? labels.notNow : labels.hide}
    </button>
  );

  if (permission === "default") {
    return (
      <div
        role="status"
        className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-900/60 dark:bg-amber-950/40"
      >
        <BellIcon className="hidden h-5 w-5 shrink-0 text-amber-600 sm:block dark:text-amber-400" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {labels.enableTitle}
          </p>
          <p className="text-amber-800 dark:text-amber-300">{labels.enableBody}</p>
          {promptIgnored && (
            <p className="mt-2 font-medium text-amber-900 dark:text-amber-200">
              {labels.promptIgnored}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dismiss}
          <button
            type="button"
            onClick={request}
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? labels.waiting : labels.enable}
          </button>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div
        role="alert"
        className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-start dark:border-red-900/60 dark:bg-red-950/40"
      >
        <BellIcon off className="hidden h-5 w-5 shrink-0 text-red-600 sm:mt-0.5 sm:block dark:text-red-400" />
        <div className="min-w-0 flex-1 text-sm text-red-800 dark:text-red-300">
          <p className="font-semibold text-red-900 dark:text-red-200">
            {labels.blockedTitle}
          </p>
          <p>{labels.blockedBody}</p>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5">
            <li>{labels.blockedStep1}</li>
            <li>{labels.blockedStep2}</li>
            <li>{labels.blockedStep3}</li>
          </ol>
          {retryFailed && <p className="mt-2 font-medium">{labels.retryFailed}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dismiss}
          <button
            type="button"
            onClick={request}
            disabled={pending}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950/60"
          >
            {labels.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950"
    >
      <BellIcon off className="hidden h-5 w-5 shrink-0 text-zinc-500 sm:block dark:text-zinc-400" />
      <div className="min-w-0 flex-1 text-sm text-zinc-700 dark:text-zinc-300">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {labels.unavailableTitle}
        </p>
        <p>{permission === "insecure" ? labels.insecure : labels.unsupported}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{dismiss}</div>
    </div>
  );
}
