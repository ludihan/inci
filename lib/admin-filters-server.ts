import { cookies } from "next/headers";
import { hasPermission } from "./auth";
import { features } from "./features";
import { listAdmins, listAreas, listUnits } from "./store";
import { FILTERS_COOKIE, parseFilters, type AdminFilters } from "./admin-filters";
import type { Admin, TicketType } from "./types";

async function readFiltersCookie(): Promise<AdminFilters> {
  const store = await cookies();
  return parseFilters(store.get(FILTERS_COOKIE)?.value);
}

export interface FilterOptions {
  /** Ticket types this admin can see; the type filter only shows with two. */
  types: TicketType[];
  units: { id: string; name: string }[];
  areas: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
}

export function ticketPermissions(admin: Admin) {
  return {
    canIT: hasPermission(admin, "it") && features.itTicketsEnabled,
    canMaintenance:
      hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled,
  };
}

const NAME_ORDER = new Intl.Collator("pt-BR");

export async function getFilterOptions(admin: Admin): Promise<FilterOptions> {
  const { canIT, canMaintenance } = ticketPermissions(admin);
  const [units, areas, admins] = await Promise.all([
    listUnits(),
    listAreas(),
    listAdmins(),
  ]);
  const byName = (a: { name: string }, b: { name: string }) =>
    NAME_ORDER.compare(a.name, b.name);
  return {
    types: [
      ...(canIT ? (["it"] as const) : []),
      ...(canMaintenance ? (["maintenance"] as const) : []),
    ],
    units: units.map((u) => ({ id: u.id, name: u.name })).sort(byName),
    areas: areas.map((a) => ({ id: a.id, name: a.name })).sort(byName),
    assignees: admins.map((a) => ({ id: a.id, name: a.name })).sort(byName),
  };
}

/**
 * The admin's global filters and the options behind them. Ids that no longer
 * exist are dropped so deleted records never silently match zero tickets.
 */
export async function loadAdminFilters(
  admin: Admin
): Promise<{ filters: AdminFilters; options: FilterOptions }> {
  const [raw, options] = await Promise.all([
    readFiltersCookie(),
    getFilterOptions(admin),
  ]);
  const known = (list: { id: string }[]) => new Set(list.map((x) => x.id));
  const units = known(options.units);
  const areas = known(options.areas);
  const assignees = known(options.assignees);
  return {
    options,
    filters: {
      ...raw,
      types: raw.types.filter((t) => options.types.includes(t)),
      units: raw.units.filter((id) => units.has(id)),
      areas: raw.areas.filter((id) => areas.has(id)),
      assignee:
        raw.assignee === "unassigned" || assignees.has(raw.assignee)
          ? raw.assignee
          : "",
    },
  };
}
