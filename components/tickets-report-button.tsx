"use client";

import { useSearchParams } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";
import { useReportGeneration } from "./use-report-generation";
import { ReportProgress } from "./report-progress";

// Downloads the spreadsheet-style tickets table PDF (color-coded by status,
// with a legend), honoring whatever type/status filters are in the URL.
export function TicketsReportButton({
  dict,
  locale,
}: {
  dict: Dict;
  locale: Locale;
}) {
  const searchParams = useSearchParams();
  const { generate, generating, elapsedMs } = useReportGeneration();

  if (generating) {
    return <ReportProgress elapsedMs={elapsedMs} label={dict.report.generating} />;
  }

  const handleClick = () => {
    const params = new URLSearchParams();
    params.set("module", "tickets");
    params.set("view", "table");
    params.set("lang", locale);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    generate(
      `/api/reports?${params.toString()}`,
      `chamados-tabela-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {dict.report.generateTable}
    </button>
  );
}
