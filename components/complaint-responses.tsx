import type { Complaint } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export function ComplaintResponses({
  complaint,
  dict,
  locale,
}: {
  complaint: Complaint;
  dict: Dict;
  locale: Locale;
}) {
  return (
    <ol className="relative space-y-6 border-l-2 border-zinc-200 pl-6 dark:border-zinc-700">
      {complaint.responses.map((r, i) => {
        const isUser = r.sender === "user";
        const actionLabel =
          r.action === "open"
            ? dict.complaint.messages.created
            : r.action === "close"
              ? dict.complaint.messages.closed
              : r.action === "message"
                ? null
                : dict.complaint.messages.reopened;
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-zinc-950 ${
                isUser ? "bg-zinc-400 dark:bg-zinc-500" : "bg-emerald-500"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {isUser
                  ? dict.complaint.anonymous
                  : (r.senderName ?? dict.common.admin)}
              </p>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {formatDate(r.createdAt, locale)}
              </span>
            </div>
            {actionLabel && (
              <p className="mt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {actionLabel}
              </p>
            )}
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
              {r.content}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
