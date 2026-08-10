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
      <h3 className="mt-3 font-semibold text-zinc-900 group-hover:underline dark:text-zinc-50">
        {complaint.subject}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
        {complaint.content}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {responses} {responses === 1 ? dict.common.msg : dict.common.msgs} ·{" "}
          {dict.complaint.anonymous}
        </span>
        {complaint.place && (
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {complaint.place.name}
          </span>
        )}
      </p>
    </Link>
  );
}
