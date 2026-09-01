import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, getLocale, type Dict } from "@/lib/i18n";
import { getTicketById } from "@/lib/store";
import { isValidCpf, onlyDigits, formatCpf, formatPhone } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { StatusBadge, TicketTypeBadge } from "@/components/badges";
import { TicketMessages } from "@/components/ticket-messages";
import { TicketReplyForm } from "@/components/ticket-reply-form";
import { TicketTransitionForm } from "@/components/ticket-transition-form";
import { NeedCpf } from "@/components/need-cpf";

function BackLink({
  locale,
  dict,
  cpf,
}: {
  locale: string;
  dict: Dict;
  cpf?: string;
}) {
  const href = cpf
    ? `/${locale}/track/ticket?cpf=${encodeURIComponent(cpf)}`
    : `/${locale}/track`;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {dict.common.back}
    </Link>
  );
}

function TicketDetail({
  ticket,
  dict,
  locale,
}: {
  ticket: Ticket;
  dict: Dict;
  locale: "pt" | "en";
}) {
  const isOpen = ticket.status !== "closed";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {ticket.id}
            </span>
            <TicketTypeBadge type={ticket.type} dict={dict} />
            <StatusBadge status={ticket.status} dict={dict} />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {dict.common.createdAt}: {ticket.createdAt.slice(0, 10)}
          </span>
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {ticket.subject}
        </h1>
        {ticket.place && (
          <p className="mt-2 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {ticket.place.name}
          </p>
        )}
        {(ticket.requesterName ||
          ticket.role ||
          ticket.equipment ||
          ticket.equipmentBrand ||
          ticket.equipmentModel ||
          ticket.requesterPhone) && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {(
              [
                [dict.ticket.fields.requesterName, ticket.requesterName],
                [
                  dict.ticket.fields.requesterPhone,
                  ticket.requesterPhone && formatPhone(ticket.requesterPhone),
                ],
                [dict.ticket.fields.role, ticket.role],
                [dict.ticket.fields.equipment, ticket.equipment],
                [dict.ticket.fields.equipmentBrand, ticket.equipmentBrand],
                [dict.ticket.fields.equipmentModel, ticket.equipmentModel],
              ] as const
            )
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {label}
                  </dt>
                  <dd className="text-zinc-800 dark:text-zinc-200">{value}</dd>
                </div>
              ))}
          </dl>
        )}
        {ticket.notes && (
          <p className="mt-3 whitespace-pre-wrap border-t border-zinc-100 pt-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            {ticket.notes}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.ticket.responses}
        </h2>
        <TicketMessages ticket={ticket} dict={dict} locale={locale} />
      </div>

      <div className="space-y-4">
        <TicketReplyForm
          dict={dict}
          lang={locale}
          ticketId={ticket.id}
          cpf={ticket.cpf}
        />

        <TicketTransitionForm
          dict={dict}
          lang={locale}
          ticketId={ticket.id}
          transition={isOpen ? "close" : "open"}
          cpf={ticket.cpf}
        />
      </div>
    </div>
  );
}

export default async function TrackTicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cpf?: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const { id } = await params;
  const { cpf: rawCpf } = await searchParams;
  const cpf = rawCpf ? onlyDigits(rawCpf) : "";

  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  if (!cpf || !isValidCpf(cpf)) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink locale={locale} dict={dict} />
        <div className="mt-8">
          <NeedCpf dict={dict} lang={locale} ticketId={ticket.id} />
        </div>
      </div>
    );
  }

  if (ticket.cpf !== cpf) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink locale={locale} dict={dict} />
        <div className="mt-8">
          <NeedCpf
            dict={dict}
            lang={locale}
            ticketId={ticket.id}
            initialError={dict.ticket.wrongCpf}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink locale={locale} dict={dict} cpf={cpf} />
      <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        {dict.ticket.fields.cpf}: {formatCpf(ticket.cpf)}
      </p>
      <div className="mt-4">
        <TicketDetail ticket={ticket} dict={dict} locale={locale} />
      </div>
    </div>
  );
}
