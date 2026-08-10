import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { getTicketsByCpf } from "@/lib/store";
import { isValidCpf, onlyDigits, formatCpf } from "@/lib/utils";
import { CpfSearch } from "@/components/cpf-search";
import { TicketCard } from "@/components/ticket-card";

export default async function TrackTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ cpf?: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const { cpf: rawCpf } = await searchParams;
  const cpf = rawCpf ? onlyDigits(rawCpf) : "";
  const cpfValid = cpf.length > 0 && isValidCpf(cpf);
  const tickets = cpfValid ? await getTicketsByCpf(cpf) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/${locale}/track`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {dict.common.back}
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.ticket.trackTitle}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          {dict.ticket.trackSubtitle}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <CpfSearch dict={dict} lang={locale} />
      </div>

      {cpfValid && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.ticket.listTitle}{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({formatCpf(cpf)})
            </span>
          </h2>
          {tickets.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {dict.ticket.empty}
            </p>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  dict={dict}
                  locale={locale}
                  href={`/${locale}/track/ticket/${ticket.id}?cpf=${encodeURIComponent(cpf)}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
