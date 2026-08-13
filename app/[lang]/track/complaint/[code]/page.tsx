import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, getLocale, type Dict } from "@/lib/i18n";
import { getComplaintByCode } from "@/lib/store";
import type { Complaint } from "@/lib/types";
import { StatusBadge } from "@/components/badges";
import { ComplaintResponses } from "@/components/complaint-responses";
import { AttachmentGallery } from "@/components/attachment-gallery";
import { CodeCopy } from "@/components/code-copy";

export default async function TrackComplaintDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const { code } = await params;

  const complaint = await getComplaintByCode(code);
  if (!complaint) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/${locale}/track/complaint`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {dict.common.back}
      </Link>

      <div className="mt-8 space-y-8">
        <CodeCopy code={complaint.code} dict={dict} />

        <div>
          <ComplaintContent complaint={complaint} dict={dict} />
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.complaint.responses}
          </h2>
          <ComplaintResponses complaint={complaint} dict={dict} locale={locale} />
        </div>

        {complaint.status === "open" && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {dict.complaint.replyPrompt}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {dict.complaint.replyHelp}
              </p>
            </div>
            <Link
              href={`/${locale}/track/complaint/${encodeURIComponent(complaint.code)}/respond`}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {dict.complaint.replyButton}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplaintContent({
  complaint,
  dict,
}: {
  complaint: Complaint;
  dict: Dict;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {dict.common.anonymous}
        </span>
        <StatusBadge status={complaint.status} dict={dict} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {complaint.subject}
      </h2>
      {complaint.place && (
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {dict.complaint.fields.place}: {complaint.place.name}
        </p>
      )}
      {complaint.attachments.length > 0 && (
        <AttachmentGallery
          attachments={complaint.attachments}
          dict={dict}
          alt={dict.complaint.fields.photo}
        />
      )}
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        {complaint.createdAt.slice(0, 10)}
      </p>
    </div>
  );
}
