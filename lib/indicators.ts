import type { Area, Ticket, TicketCriticality, Unit } from "./types";
import { slaInfo } from "./sla";

export interface CountRow {
  /** Catalog id; undefined for the "No area"/"No unit" bucket. */
  id?: string;
  label: string;
  value: number;
}

export interface Indicators {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  closedOnTime: number;
  /** Open tickets past their deadline, most late first. */
  late: Ticket[];
  /** Every registered area (zeros included), in catalog order. */
  areas: CountRow[];
  noArea: number;
  /** Every registered unit (zeros included), in catalog order. */
  units: CountRow[];
  noUnit: number;
  criticality: Record<TicketCriticality, number>;
}

export function computeIndicators(
  tickets: Ticket[],
  units: Unit[],
  areas: Area[],
  now: number
): Indicators {
  const count = (pred: (t: Ticket) => boolean) => tickets.filter(pred).length;
  const sla = new Map(tickets.map((t) => [t.id, slaInfo(t, now)]));
  const closed = tickets.filter((t) => t.status === "closed");
  return {
    total: tickets.length,
    open: count((t) => t.status === "open"),
    inProgress: count((t) => t.status === "in_progress"),
    closed: closed.length,
    closedOnTime: closed.filter((t) => sla.get(t.id)!.state === "done_on_time").length,
    late: tickets
      .filter((t) => sla.get(t.id)!.state === "late")
      .sort((a, b) => sla.get(a.id)!.remainingMs - sla.get(b.id)!.remainingMs),
    areas: areas.map((a) => ({
      id: a.id,
      label: a.name,
      value: count((t) => t.area?.id === a.id),
    })),
    noArea: count((t) => !t.area),
    units: units.map((u) => ({
      id: u.id,
      label: u.name,
      value: count((t) => t.unit?.id === u.id),
    })),
    noUnit: count((t) => !t.unit),
    criticality: {
      critica: count((t) => t.criticality === "critica"),
      urgente: count((t) => t.criticality === "urgente"),
      medio: count((t) => t.criticality === "medio"),
      baixo: count((t) => t.criticality === "baixo"),
    },
  };
}

export function pct(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : "—";
}
