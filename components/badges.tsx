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

// Subtle background + hairline border + matching text, not heavy saturated
// fills — keeps semantic color legible without fighting the flat, bordered
// look used for cards/tables elsewhere.
const CRITICALITY_CLASS: Record<TicketCriticality, string> = {
  critica:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  urgente:
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  medio:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  baixo:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CRITICALITY_CLASS[criticality]}`}
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isIt
          ? "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900"
          : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {dict.common.inProgress}
      </span>
    );
  }
  const isOpen = status === "open";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isOpen
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
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
