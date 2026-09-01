import type { Admin, Ticket } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatCpf, formatDateTime, formatPhone } from "@/lib/utils";
import { assumeTicket, releaseTicket } from "@/lib/actions";
import { CriticalityBadge, StatusBadge, TicketTypeBadge } from "@/components/badges";
import { TicketMessages } from "@/components/ticket-messages";
import { TicketCriticalitySelect } from "@/components/ticket-criticality-select";
import { TicketReplyForm } from "@/components/ticket-reply-form";
import { TicketTransitionForm } from "@/components/ticket-transition-form";
import { CopyButton } from "@/components/copy-button";
import { ReportDownloadButton } from "@/components/report-download-button";

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0" title={value}>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="truncate text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}

export function TicketDetailPanel({
  ticket,
  admin,
  dict,
  locale,
}: {
  ticket: Ticket;
  admin: Admin;
  dict: Dict;
  locale: Locale;
}) {
  const isClosed = ticket.status === "closed";
  const isAssignee = ticket.assignedToId === admin.id;

  const assignButton =
    ticket.assignedToId === admin.id ? (
      isClosed ? null : (
        <form action={releaseTicket}>
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="id" value={ticket.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            {dict.admin.release}
          </button>
        </form>
      )
    ) : (
      <form action={assumeTicket}>
        <input type="hidden" name="lang" value={locale} />
        <input type="hidden" name="id" value={ticket.id} />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {ticket.assignedToId ? dict.admin.reassign : dict.admin.assume}
        </button>
      </form>
    );

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2 py-1 font-mono text-xs font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
              {ticket.id}
              <CopyButton value={ticket.id} dict={dict} stopPropagation />
            </span>
            <TicketTypeBadge type={ticket.type} dict={dict} />
            <StatusBadge status={ticket.status} dict={dict} />
            <CriticalityBadge criticality={ticket.criticality} dict={dict} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              {dict.common.createdAt}: {formatDateTime(ticket.createdAt, locale)}
            </span>
            <ReportDownloadButton
              url={`/api/reports?module=tickets&ids=${encodeURIComponent(ticket.id)}&lang=${locale}`}
              filename={`${ticket.id}.pdf`}
              dict={dict}
            />
          </div>
        </div>

        <h1 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
          {ticket.subject}
        </h1>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-3">
          <InfoField label={dict.ticket.fields.cpf} value={formatCpf(ticket.cpf)} />
          {ticket.place && (
            <InfoField label={dict.ticket.fields.place} value={ticket.place.name} />
          )}
          {ticket.requesterName && (
            <InfoField label={dict.ticket.fields.requesterName} value={ticket.requesterName} />
          )}
          {ticket.requesterPhone && (
            <InfoField
              label={dict.ticket.fields.requesterPhone}
              value={formatPhone(ticket.requesterPhone)}
            />
          )}
          {ticket.role && (
            <InfoField label={dict.ticket.fields.role} value={ticket.role} />
          )}
          {ticket.equipment && (
            <InfoField label={dict.ticket.fields.equipment} value={ticket.equipment} />
          )}
          {ticket.equipmentBrand && (
            <InfoField label={dict.ticket.fields.equipmentBrand} value={ticket.equipmentBrand} />
          )}
          {ticket.equipmentModel && (
            <InfoField label={dict.ticket.fields.equipmentModel} value={ticket.equipmentModel} />
          )}
        </div>

        {ticket.notes && (
          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {dict.ticket.fields.notes}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-800 dark:text-zinc-200">
              {ticket.notes}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {dict.admin.assignedTo}:{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {ticket.assignedToName ?? dict.admin.unassigned}
            </span>
          </p>
          <div className="flex items-center gap-2">{assignButton}</div>
        </div>

        {isAssignee && !isClosed && (
          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <TicketCriticalitySelect
              dict={dict}
              lang={locale}
              ticketId={ticket.id}
              criticality={ticket.criticality}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.ticket.responses}
        </h2>
        <div className="max-h-72 overflow-y-auto py-1 pr-1 pl-3">
          <TicketMessages ticket={ticket} dict={dict} locale={locale} />
        </div>
      </div>

      <div className="space-y-3">
        {isAssignee ? (
          <>
            <div className={cardClass}>
              <TicketReplyForm dict={dict} lang={locale} ticketId={ticket.id} admin />
            </div>
            <div className={cardClass}>
              <TicketTransitionForm
                dict={dict}
                lang={locale}
                ticketId={ticket.id}
                transition={isClosed ? "open" : "close"}
                admin
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {ticket.assignedToId
              ? dict.admin.notAssigneeWithName.replace(
                  "{name}",
                  ticket.assignedToName ?? ""
                )
              : dict.admin.notAssignedYet}
          </div>
        )}
      </div>
    </div>
  );
}
