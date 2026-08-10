import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import {
  getCurrentAdmin,
  hasPermission,
  moduleForTicketType,
} from "@/lib/auth";
import { getTicketById } from "@/lib/store";
import { formatCpf } from "@/lib/utils";
import { StatusBadge, TicketTypeBadge } from "@/components/badges";
import { TicketMessages } from "@/components/ticket-messages";
import { TicketReplyForm } from "@/components/ticket-reply-form";
import { TicketTransitionForm } from "@/components/ticket-transition-form";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const { id } = await params;
  const ticket = await getTicketById(id);

  if (!ticket) {
    return (
      <p className="py-16 text-center text-zinc-500 dark:text-zinc-400">
        {dict.common.notFound}
      </p>
    );
  }

  if (!hasPermission(admin, moduleForTicketType(ticket.type))) {
    redirect(`/${locale}/admin`);
  }

  const isOpen = ticket.status === "open";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/${locale}/admin/tickets`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {dict.common.back}
      </Link>

      <div className="mt-6 space-y-8">
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
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {dict.ticket.fields.cpf}: {formatCpf(ticket.cpf)}
          </p>
          {ticket.place && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {dict.ticket.fields.place}: {ticket.place.name}
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <TicketReplyForm dict={dict} lang={locale} ticketId={ticket.id} admin />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <TicketTransitionForm
              dict={dict}
              lang={locale}
              ticketId={ticket.id}
              transition={isOpen ? "close" : "open"}
              admin
            />
          </div>
        </div>
      </div>
    </div>
  );
}
