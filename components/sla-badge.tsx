"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  formatDeadline,
  formatSlaHours,
  slaHeadline,
  slaInfo,
  type SlaState,
  type SlaTicket,
} from "@/lib/sla";

/**
 * The current time, ticking every 30s. Starts from the time the server
 * rendered with, so the first client render matches the HTML.
 */
export function useNow(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const PILL: Record<SlaState, string> = {
  late: "bg-red-600 text-white ring-red-700 dark:bg-red-600 dark:text-white dark:ring-red-500",
  due_soon:
    "bg-amber-50 text-amber-900 ring-amber-500 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-700",
  on_time:
    "bg-white text-emerald-800 ring-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
  done_on_time:
    "bg-white/70 text-zinc-700 ring-zinc-400/50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700",
  done_late:
    "bg-white/70 text-red-800 ring-red-400/60 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800",
};

function ClockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.2"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.6"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/** The bare pill, for samples (see TicketsLegend). */
export function SlaPill({
  state,
  children,
}: {
  state: SlaState;
  children: React.ReactNode;
}) {
  const done = state === "done_on_time" || state === "done_late";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${PILL[state]}`}
    >
      {done ? <CheckIcon /> : <ClockIcon />}
      {children}
    </span>
  );
}

/** Pill with the time left (or how late), and optionally the deadline below it. */
export function SlaBadge({
  ticket,
  serverNow,
  locale,
  now: nowProp,
  showDeadline = true,
}: {
  ticket: SlaTicket;
  serverNow: number;
  locale: Locale;
  /** Shared clock from a parent (e.g. a table); otherwise ticks on its own. */
  now?: number;
  showDeadline?: boolean;
}) {
  const ownNow = useNow(serverNow);
  const info = slaInfo(ticket, nowProp ?? ownNow);
  const done = info.state === "done_on_time" || info.state === "done_late";
  const deadlineText = formatDeadline(info.deadline, locale, ticket.clientTimezone);
  const title =
    locale === "pt"
      ? `Tempo de resposta: ${formatSlaHours(info.hours, locale)} · prazo ${deadlineText}`
      : `Response SLA: ${formatSlaHours(info.hours, locale)} · due ${deadlineText}`;

  return (
    <span className="inline-flex flex-col items-start gap-0.5" title={title}>
      <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${PILL[info.state]}`}
      >
        {done ? <CheckIcon /> : <ClockIcon />}
        {slaHeadline(info, locale)}
      </span>
      {showDeadline && (
        <span className="whitespace-nowrap pl-1 text-[11px] font-medium opacity-75">
          {locale === "pt"
            ? `${done ? "prazo era" : "até"} ${deadlineText}`
            : `${done ? "was due" : "due"} ${deadlineText}`}
        </span>
      )}
    </span>
  );
}
