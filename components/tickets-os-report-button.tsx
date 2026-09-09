"use client";

import { useSearchParams } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";
import { useReportGeneration } from "./use-report-generation";
import { ReportProgress } from "./report-progress";

// Generates one Ordem de Serviço (Service Order) PDF per ticket currently
// shown by the admin list filters.
export function TicketsOsReportButton({
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    params.set("module", "tickets");
    params.set("view", "os");
    params.set("lang", locale);
    generate(
      `/api/reports?${params.toString()}`,
      `ordens-de-servico-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      {dict.report.os.generate}
    </button>
  );
}
