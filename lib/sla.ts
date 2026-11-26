import type { Locale } from "./i18n";
import type { Ticket, TicketCriticality } from "./types";

// Response time (SLA) by criticality: a ticket's deadline is its creation
// timestamp plus the hours for its current criticality. The clock stops when
// the ticket is closed (reopening resumes counting from the original deadline).
export const SLA_HOURS: Record<TicketCriticality, number> = {
  critica: 72,
  urgente: 120,
  medio: 168,
  baixo: 240,
};

/** Final fraction of the window in which a ticket is flagged as "due soon". */
const DUE_SOON_FRACTION = 0.25;

export type SlaState = "on_time" | "due_soon" | "late" | "done_on_time" | "done_late";

export interface SlaInfo {
  state: SlaState;
  hours: number;
  deadline: number;
  /** For an open ticket: time left (negative = late). For a closed one: the
   *  margin it was closed with (negative = how late). */
  remainingMs: number;
  /** Share of the window already used, 0..1+ (above 1 = late). */
  used: number;
  closedAt?: number;
}

export type SlaTicket = Pick<
  Ticket,
  "createdAt" | "criticality" | "status" | "messages" | "clientTimezone"
>;

/** When the ticket was last closed, if it is closed. */
export function ticketClosedAt(t: Pick<Ticket, "status" | "messages">): string | undefined {
  if (t.status !== "closed") return undefined;
  for (let i = t.messages.length - 1; i >= 0; i--) {
    if (t.messages[i].action === "close") return t.messages[i].createdAt;
  }
  return undefined;
}

export function slaInfo(
  t: Pick<Ticket, "createdAt" | "criticality" | "status" | "messages">,
  now: number = Date.now()
): SlaInfo {
  const hours = SLA_HOURS[t.criticality];
  const start = Date.parse(t.createdAt);
  const deadline = start + hours * 3_600_000;
  const window = hours * 3_600_000;
  const closedIso = ticketClosedAt(t);
  if (t.status === "closed") {
    const closedAt = closedIso ? Date.parse(closedIso) : now;
    const remainingMs = deadline - closedAt;
    return {
      state: remainingMs >= 0 ? "done_on_time" : "done_late",
      hours,
      deadline,
      remainingMs,
      used: (closedAt - start) / window,
      closedAt,
    };
  }
  const remainingMs = deadline - now;
  return {
    state:
      remainingMs < 0
        ? "late"
        : remainingMs <= window * DUE_SOON_FRACTION
          ? "due_soon"
          : "on_time",
    hours,
    deadline,
    remainingMs,
    used: (now - start) / window,
  };
}

/** "2d 4h", "5h 12min", "12min" — two units at most. */
export function formatSlaDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(Math.abs(ms) / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m}min`;
}

export function formatSlaHours(hours: number, locale: Locale): string {
  if (hours % 24 === 0 && hours >= 48) {
    const days = hours / 24;
    return locale === "pt" ? `${hours}h (${days} dias)` : `${hours}h (${days} days)`;
  }
  return `${hours}h`;
}

export function slaHeadline(info: SlaInfo, locale: Locale): string {
  const dur = formatSlaDuration(info.remainingMs);
  if (locale === "pt") {
    switch (info.state) {
      case "late":
        return `Atrasado ${dur}`;
      case "due_soon":
      case "on_time":
        return `Restam ${dur}`;
      case "done_on_time":
        return "Concluído no prazo";
      case "done_late":
        return `Atrasou ${dur}`;
    }
  }
  switch (info.state) {
    case "late":
      return `Overdue ${dur}`;
    case "due_soon":
    case "on_time":
      return `${dur} left`;
    case "done_on_time":
      return "Closed on time";
    case "done_late":
      return `Late by ${dur}`;
  }
}

export function formatDeadline(ms: number, locale: Locale, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || "America/Sao_Paulo",
  }).format(new Date(ms));
}

/**
 * The request's render time, for server components that hand a starting
 * clock to the client badges (see useNow).
 */
export function requestTime(): number {
  return Date.now();
}
