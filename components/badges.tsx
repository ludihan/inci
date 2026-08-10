import type { ComplaintStatus, TicketStatus, TicketType } from "@/lib/types";
import type { Dict } from "@/lib/i18n";

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
