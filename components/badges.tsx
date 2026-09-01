import type {
  ComplaintStatus,
  TicketCriticality,
  TicketStatus,
  TicketType,
} from "@/lib/types";
import type { Dict } from "@/lib/i18n";

export const CRITICALITY_ORDER: TicketCriticality[] = [
  "critica",
  "urgente",
  "medio",
  "baixo",
];

const CRITICALITY_CLASS: Record<TicketCriticality, string> = {
  critica: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  urgente: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  medio: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  baixo: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function CriticalityBadge({
  criticality,
  dict,
}: {
  criticality: TicketCriticality;
  dict: Dict;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CRITICALITY_CLASS[criticality]}`}
    >
      {dict.ticket.criticality[criticality]}
    </span>
  );
}

export function TicketTypeBadge({
  type,
  dict,
}: {
  type: TicketType;
  dict: Dict;
}) {
  const isIt = type === "it";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isIt
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {isIt ? dict.ticket.fields.it : dict.ticket.fields.maintenance}
    </span>
  );
}

export function StatusBadge({
  status,
  dict,
}: {
  status: TicketStatus | ComplaintStatus;
  dict: Dict;
}) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {dict.common.inProgress}
      </span>
    );
  }
  const isOpen = status === "open";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isOpen
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isOpen ? "bg-emerald-500" : "bg-zinc-400"
        }`}
      />
      {isOpen ? dict.common.open : dict.common.closed}
    </span>
  );
}
