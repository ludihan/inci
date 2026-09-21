import type {
  Ticket,
  TicketCriticality,
  TicketStatus,
  TicketType,
} from "./types";

// Single source of truth for the admin tickets list filters. The table on
// screen, the table PDF export and the single-ticket reports all run tickets
// through this so they always show the same rows in the same order.

export const TICKET_TYPES: readonly TicketType[] = ["it", "maintenance"];
export const TICKET_STATUSES: readonly TicketStatus[] = [
  "open",
  "in_progress",
  "closed",
];
export const CRITICALITY_ORDER: readonly TicketCriticality[] = [
  "critica",
  "urgente",
  "medio",
  "baixo",
];
// "Fechado" / "closed" is hidden by default.
const DEFAULT_STATUSES: readonly TicketStatus[] = ["open", "in_progress"];
const DEFAULT_PERIOD_DAYS = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface TicketListParams {
  type?: string;
  status?: string;
  criticality?: string;
  unit?: string;
  assignee?: string;
  from?: string;
  to?: string;
  /** Column id to sort by (see SORT_KEYS). Defaults to "createdAt". */
  sort?: string;
  /** "asc" | "desc". Defaults to "desc". */
  dir?: string;
}

const CRITICALITY_RANK: Record<TicketCriticality, number> = {
  critica: 0,
  urgente: 1,
  medio: 2,
  baixo: 3,
};

function equipmentLabel(t: Ticket): string {
  const extra = [t.equipmentBrand, t.equipmentModel].filter(Boolean).join(" / ");
  return extra ? `${t.equipment} (${extra})` : t.equipment;
}

// Sort keys mirror the clickable columns of the admin tickets table.
export const SORT_KEYS: Record<string, (t: Ticket) => string | number> = {
  criticality: (t) => CRITICALITY_RANK[t.criticality],
  assignee: (t) => t.assignedToName ?? "",
  id: (t) => t.id,
  createdAt: (t) => t.createdAt,
  requesterName: (t) => t.requesterName,
  role: (t) => t.role,
  unit: (t) => t.unit?.name ?? "",
  area: (t) => t.area?.name ?? "",
  equipment: equipmentLabel,
  subject: (t) => t.subject,
  notes: (t) => t.notes ?? "",
};

const DEFAULT_SORT = "createdAt";

export function sortTicketList(
  tickets: Ticket[],
  sort: string | undefined,
  dir: string | undefined
): Ticket[] {
  const key = sort && SORT_KEYS[sort] ? sort : DEFAULT_SORT;
  // Anything that isn't an explicit "asc" is treated as descending (the default).
  const descending = dir !== "asc";
  const get = SORT_KEYS[key];
  const cmp = (a: Ticket, b: Ticket): number => {
    const va = get(a);
    const vb = get(b);
    let r: number;
    if (typeof va === "number" && typeof vb === "number") {
      r = va - vb;
    } else {
      r = String(va).localeCompare(String(vb), "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
    }
    // Tie-break by creation date (newest first) then id, for a stable order.
    if (r === 0 && key !== "createdAt") r = b.createdAt.localeCompare(a.createdAt);
    if (r === 0) r = a.id.localeCompare(b.id);
    return descending ? -r : r;
  };
  return [...tickets].sort(cmp);
}

export interface TicketListPermissions {
  canIT: boolean;
  canMaintenance: boolean;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseFilterList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: readonly T[]
): T[] {
  if (raw === undefined || raw === "") return [...fallback];
  if (raw === "all") return [...allowed];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s));
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

/**
 * Resolves the effective period. An absent param falls back to the default
 * window (last 30 days → today); an empty/invalid param means "no bound on
 * that side".
 */
export function resolvePeriod(params: TicketListParams): {
  from?: string;
  to?: string;
} {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_PERIOD_DAYS);
  const from =
    params.from === undefined
      ? isoDate(defaultFrom)
      : DATE_RE.test(params.from)
        ? params.from
        : undefined;
  const to =
    params.to === undefined
      ? isoDate(now)
      : DATE_RE.test(params.to)
        ? params.to
        : undefined;
  return { from, to };
}

/**
 * Filters and sorts tickets exactly like the admin list. `tickets` should be
 * the full set — visibility by module permission is applied here.
 */
export function filterTicketList(
  tickets: Ticket[],
  params: TicketListParams,
  perms: TicketListPermissions
): Ticket[] {
  const permittedTypes = TICKET_TYPES.filter(
    (t) =>
      (t === "it" && perms.canIT) ||
      (t === "maintenance" && perms.canMaintenance)
  );

  const visible = tickets.filter((t) => permittedTypes.includes(t.type));

  const typeList = parseFilterList(
    params.type,
    TICKET_TYPES,
    permittedTypes
  ).filter((t) => permittedTypes.includes(t));
  const statusList = parseFilterList(
    params.status,
    TICKET_STATUSES,
    DEFAULT_STATUSES
  );
  const criticalityList = parseFilterList(
    params.criticality,
    CRITICALITY_ORDER,
    CRITICALITY_ORDER
  );

  const { from, to } = resolvePeriod(params);

  const allUnitIds = Array.from(
    visible.reduce((map, t) => {
      if (t.unit && !map.has(t.unit.id)) map.set(t.unit.id, t.unit.name);
      return map;
    }, new Map<string, string>())
  )
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
    .map(([id]) => id);
  const unitList = parseFilterList(params.unit, allUnitIds, allUnitIds);

  const assignedIds = new Set(
    visible
      .filter((t) => t.assignedToId && t.assignedToName)
      .map((t) => t.assignedToId as string)
  );
  const assigneeFilter =
    params.assignee === "unassigned" ||
    (params.assignee && assignedIds.has(params.assignee))
      ? params.assignee
      : undefined;

  const matched = visible.filter((t) => {
    if (!typeList.includes(t.type)) return false;
    if (!statusList.includes(t.status)) return false;
    if (!criticalityList.includes(t.criticality)) return false;
    if (
      !sameSet(unitList, allUnitIds) &&
      (!t.unit || !unitList.includes(t.unit.id))
    )
      return false;
    if (from && t.createdAt.slice(0, 10) < from) return false;
    if (to && t.createdAt.slice(0, 10) > to) return false;
    if (assigneeFilter === "unassigned" && t.assignedToId) return false;
    if (
      assigneeFilter &&
      assigneeFilter !== "unassigned" &&
      t.assignedToId !== assigneeFilter
    )
      return false;
    return true;
  });

  return sortTicketList(matched, params.sort, params.dir);
}
