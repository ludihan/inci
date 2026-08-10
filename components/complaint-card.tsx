import Link from "next/link";
import type { Complaint } from "@/lib/types";
import type { Dict } from "@/lib/i18n";
import { StatusBadge } from "./badges";

export function ComplaintCard({
  complaint,
  dict,
  href,
}: {
  complaint: Complaint;
  dict: Dict;
  href: string;
}) {
  const responses = complaint.responses.length;
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {complaint.code}
          </span>
          <StatusBadge status={complaint.status} dict={dict} />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {complaint.updatedAt.slice(0, 10)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
        {complaint.content}
      </p>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {responses} {responses === 1 ? dict.common.msg : dict.common.msgs} ·{" "}
        {dict.complaint.anonymous}
      </p>
    </Link>
  );
}
