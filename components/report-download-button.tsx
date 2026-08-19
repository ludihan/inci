"use client";

import { useReportGeneration } from "./use-report-generation";
import { ReportProgress } from "./report-progress";
import type { Dict } from "@/lib/i18n";

export function ReportDownloadButton({
  url,
  filename,
  dict,
}: {
  url: string;
  filename: string;
  dict: Dict;
}) {
  const { generate, generating, elapsedMs } = useReportGeneration();

  if (generating) {
    return <ReportProgress elapsedMs={elapsedMs} label={dict.report.generating} />;
  }

  return (
    <button
      type="button"
      onClick={() => generate(url, filename)}
      title={dict.report.generate}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    </button>
  );
}
