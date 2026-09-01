import type { Ticket } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { AttachmentGallery } from "./attachment-gallery";

// Color-codes the timeline dot by the kind of event it marks, so the
// history is scannable at a glance (ported from inci-masf-fsa).
const DOT_COLOR_BY_ACTION: Record<string, string> = {
  close: "bg-red-500",
  assume: "bg-amber-500",
  forward: "bg-amber-500",
  release: "bg-zinc-400 dark:bg-zinc-500",
  message: "bg-sky-500",
};

export function TicketMessages({
  ticket,
  dict,
  locale,
}: {
  ticket: Ticket;
  dict: Dict;
  locale: Locale;
}) {
  return (
    <ol className="relative space-y-6 border-l-2 border-zinc-200 pl-6 dark:border-zinc-700">
      {ticket.messages.map((msg, i) => {
        const isUser = msg.sender === "user";
        const isAssignment =
          msg.action === "assume" ||
          msg.action === "forward" ||
          msg.action === "release";
        const actionLabel =
          msg.action === "open"
            ? dict.ticket.messages.created
            : msg.action === "close"
              ? dict.ticket.messages.closed
              : msg.action === "assume"
                ? dict.ticket.messages.assumed
                : msg.action === "forward"
                  ? `${dict.ticket.messages.forwardedTo} ${msg.content}`.trim()
                  : msg.action === "release"
                    ? dict.ticket.messages.released
                    : msg.action === "message"
                      ? null
                      : dict.ticket.messages.reopened;
        const isReopen = msg.action === "open" && isUser;
        const dotColor =
          DOT_COLOR_BY_ACTION[msg.action] ??
          (msg.action === "open"
            ? isReopen
              ? "bg-sky-500"
              : "bg-emerald-500"
            : "bg-zinc-400 dark:bg-zinc-500");
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-zinc-950 ${dotColor}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {isUser
                  ? dict.common.requester
                  : (msg.senderName ?? dict.common.admin)}
              </p>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {formatDate(msg.createdAt, locale)}
              </span>
            </div>
            {actionLabel && (
              <p className="mt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {actionLabel}
              </p>
            )}
            {!isAssignment && (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                {msg.content}
              </p>
            )}
            {msg.attachments.length > 0 && (
              <AttachmentGallery
                attachments={msg.attachments}
                dict={dict}
                alt={dict.ticket.fields.photo}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
