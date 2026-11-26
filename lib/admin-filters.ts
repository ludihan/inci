import type { Ticket, TicketCriticality, TicketStatus, TicketType } from "./types";
import { SLA_FILTERS, slaFilterOf, slaInfo, type SlaFilter } from "./sla";

// Global filters of the admin area. They live in a cookie, so the dashboard
// and the tickets list read the same selection on the server and the admin
// never has to redo them when switching pages.
export const FILTERS_COOKIE = "admin_filters";

export const FILTER_TYPES: readonly TicketType[] = ["it", "maintenance"];
export const FILTER_STATUSES: readonly TicketStatus[] = ["open", "in_progress", "closed"];
export const FILTER_CRITICALITIES: readonly TicketCriticality[] = [
  "critica",
  "urgente",
  "medio",
  "baixo",
];

export interface AdminFilters {
  /** YYYY-MM-DD, or "" for no lower bound. */
  from: string;
  /** YYYY-MM-DD, or "" for no upper bound. */
  to: string;
  types: TicketType[];
  statuses: TicketStatus[];
  criticalities: TicketCriticality[];
  /** Response-time situation (see lib/sla). */
  deadline: SlaFilter[];
  /** Unit ids. */
  units: string[];
  /** Area ids. */
  areas: string[];
  /** "" (anyone), "unassigned" or an admin id. */
  assignee: string;
}

export const EMPTY_FILTERS: AdminFilters = {
  from: "",
  to: "",
  types: [],
  statuses: [],
  criticalities: [],
  deadline: [],
  units: [],
  areas: [],
  assignee: "",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[\w-]{1,64}$/;

function pickList<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((v): v is T => (allowed as readonly unknown[]).includes(v)))
  );
}

function pickIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((v): v is string => typeof v === "string" && ID_RE.test(v)))
  ).slice(0, 200);
}

/** Reads the cookie value; anything malformed falls back to "no filter". */
export function parseFilters(raw: string | undefined | null): AdminFilters {
  if (!raw) return { ...EMPTY_FILTERS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    try {
      data = JSON.parse(decodeURIComponent(raw));
    } catch {
      return { ...EMPTY_FILTERS };
    }
  }
  if (!data || typeof data !== "object") return { ...EMPTY_FILTERS };
  const d = data as Record<string, unknown>;
  const date = (v: unknown) => (typeof v === "string" && DATE_RE.test(v) ? v : "");
  const assignee =
    typeof d.assignee === "string" && (d.assignee === "unassigned" || ID_RE.test(d.assignee))
      ? d.assignee
      : "";
  return {
    from: date(d.from),
    to: date(d.to),
    types: pickList(d.types, FILTER_TYPES),
    statuses: pickList(d.statuses, FILTER_STATUSES),
    criticalities: pickList(d.criticalities, FILTER_CRITICALITIES),
    deadline: pickList(d.deadline, SLA_FILTERS),
    units: pickIds(d.units),
    areas: pickIds(d.areas),
    assignee,
  };
}

export function serializeFilters(f: AdminFilters): string {
  const out: Partial<AdminFilters> = {};
  if (f.from) out.from = f.from;
  if (f.to) out.to = f.to;
  if (f.types.length) out.types = f.types;
  if (f.statuses.length) out.statuses = f.statuses;
  if (f.criticalities.length) out.criticalities = f.criticalities;
  if (f.deadline.length) out.deadline = f.deadline;
  if (f.units.length) out.units = f.units;
  if (f.areas.length) out.areas = f.areas;
  if (f.assignee) out.assignee = f.assignee;
  return JSON.stringify(out);
}

/** How many filter groups are in use (the period counts as one). */
export function activeFilterCount(f: AdminFilters): number {
  return (
    (f.from || f.to ? 1 : 0) +
    (f.types.length ? 1 : 0) +
    (f.statuses.length ? 1 : 0) +
    (f.criticalities.length ? 1 : 0) +
    (f.deadline.length ? 1 : 0) +
    (f.units.length ? 1 : 0) +
    (f.areas.length ? 1 : 0) +
    (f.assignee ? 1 : 0)
  );
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/** The calendar day (YYYY-MM-DD) the ticket was opened on, in the requester's time zone. */
export function ticketDay(t: Pick<Ticket, "createdAt" | "clientTimezone">): string {
  const tz = t.clientTimezone || DEFAULT_TIMEZONE;
  let fmt = dayFormatters.get(tz);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return t.createdAt.slice(0, 10);
    }
    dayFormatters.set(tz, fmt);
  }
  return fmt.format(new Date(t.createdAt));
}

export function matchesFilters(
  t: Ticket,
  f: AdminFilters,
  now: number = Date.now()
): boolean {
  if (f.types.length && !f.types.includes(t.type)) return false;
  if (f.statuses.length && !f.statuses.includes(t.status)) return false;
  if (f.criticalities.length && !f.criticalities.includes(t.criticality)) return false;
  if (f.units.length && (!t.unit || !f.units.includes(t.unit.id))) return false;
  if (f.areas.length && (!t.area || !f.areas.includes(t.area.id))) return false;
  const day = ticketDay(t);
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  if (f.assignee === "unassigned" && t.assignedToId) return false;
  if (f.assignee && f.assignee !== "unassigned" && t.assignedToId !== f.assignee) return false;
  if (f.deadline.length && !f.deadline.includes(slaFilterOf(slaInfo(t, now).state))) return false;
  return true;
}

export function applyFilters(tickets: Ticket[], f: AdminFilters): Ticket[] {
  const now = Date.now();
  return tickets.filter((t) => matchesFilters(t, f, now));
}

export type FilterKey = keyof Omit<AdminFilters, "from" | "to"> | "period";

export function clearFilter(f: AdminFilters, key: FilterKey): AdminFilters {
  if (key === "period") return { ...f, from: "", to: "" };
  if (key === "assignee") return { ...f, assignee: "" };
  return { ...f, [key]: [] };
}
