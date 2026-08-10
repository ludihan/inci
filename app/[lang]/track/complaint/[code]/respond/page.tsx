import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getComplaintByCode } from "@/lib/store";
import { ComplaintReplyForm } from "@/components/complaint-reply-form";

export default async function TrackComplaintReplyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const { code } = await params;

  const complaint = await getComplaintByCode(code);
  if (!complaint) notFound();

  if (complaint.status === "closed") {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}/track/complaint/${encodeURIComponent(code)}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {dict.common.back}
        </Link>
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.complaint.closed}
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {dict.complaint.replyClosed}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${locale}/track/complaint/${encodeURIComponent(code)}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {dict.common.back}
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.complaint.replyTitle}
        </h1>
        <p className="mt-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">
          {complaint.code}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <ComplaintReplyForm dict={dict} lang={locale} code={code} />
      </div>
    </div>
  );
}
