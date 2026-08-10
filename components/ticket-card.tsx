import Link from "next/link";
import type { Ticket } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { StatusBadge, TicketTypeBadge } from "./badges";

export function TicketCard({
  ticket,
  dict,
  locale,
  href,
}: {
  ticket: Ticket;
  dict: Dict;
  locale: Locale;
  href: string;
}) {
  const messages = ticket.messages.length;
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {ticket.id}
          </span>
          <TicketTypeBadge type={ticket.type} dict={dict} />
          <StatusBadge status={ticket.status} dict={dict} />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatDate(ticket.updatedAt, locale)}
        </span>
      </div>
      <h3 className="mt-3 font-semibold text-zinc-900 group-hover:underline dark:text-zinc-50">
        {ticket.subject}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
        {ticket.messages[ticket.messages.length - 1]?.content}
      </p>
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {messages} {messages === 1 ? dict.common.msg : dict.common.msgs}
        </span>
      </div>
    </Link>
  );
}
