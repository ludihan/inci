import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { ComplaintForm } from "@/components/complaint-form";

export default async function NewComplaintPage() {
  const dict = await getDict();
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {dict.common.back}
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.complaint.newTitle}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          {dict.complaint.newSubtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <ComplaintForm dict={dict} lang={locale} />
      </div>
    </div>
  );
}
