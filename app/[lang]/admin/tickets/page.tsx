import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { features } from "@/lib/features";
import { getDB } from "@/lib/store";
import {
  filterTicketList,
  resolvePeriod,
  SORT_KEYS,
  CRITICALITY_ORDER,
  type TicketListParams,
} from "@/lib/ticket-list-filter";
import { TicketCard } from "@/components/ticket-card";
import { TicketsTable } from "@/components/tickets-table";
import { TicketCodeJump } from "@/components/ticket-code-jump";
import { TicketsReportButton } from "@/components/tickets-report-button";
import { TicketsOsReportButton } from "@/components/tickets-os-report-button";

const selectClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

function one(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v.join(",");
  return v;
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  if (!canIT && !canMaintenance) {
    redirect(`/${locale}/admin`);
  }

  const sp = await searchParams;
  const params: TicketListParams = {
    type: one(sp.type),
    status: one(sp.status),
    criticality: one(sp.criticality),
    unit: one(sp.unit),
    assignee: one(sp.assignee),
    from: one(sp.from),
    to: one(sp.to),
    sort: one(sp.sort) && SORT_KEYS[one(sp.sort)!] ? one(sp.sort) : undefined,
    dir: one(sp.dir) === "asc" ? "asc" : one(sp.dir) === "desc" ? "desc" : undefined,
  };

  const db = await getDB();
  const tickets = filterTicketList(db.tickets, params, {
    canIT,
    canMaintenance,
  });

  const period = resolvePeriod(params);
  const t = dict.admin.tickets.filters;

  const units = [...db.units].sort((a, b) => a.name.localeCompare(b.name));
  const assignableAdmins = db.admins
    .filter((a) =>
      db.tickets.some((tk) => tk.assignedToId === a.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeFilterCount = [
    params.type,
    params.status,
    params.criticality,
    params.unit,
    params.assignee,
    sp.from !== undefined ? params.from : undefined,
    sp.to !== undefined ? params.to : undefined,
  ].filter((v) => v !== undefined && v !== "").length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {dict.admin.tickets.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t.showing.replace("{count}", String(tickets.length))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TicketsOsReportButton dict={dict} locale={locale} />
          <TicketsReportButton dict={dict} locale={locale} />
          <TicketCodeJump dict={dict} locale={locale} />
        </div>
      </div>

      <details
        open={activeFilterCount > 0}
        className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {t.title}
          {activeFilterCount > 0 && (
            <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
              {activeFilterCount} {t.active}
            </span>
          )}
        </summary>
        <form
          method="get"
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          {params.dir && <input type="hidden" name="dir" value={params.dir} />}

          <label className="block">
            <span className={labelClass}>{t.type}</span>
            <select name="type" defaultValue={params.type ?? ""} className={selectClass}>
              <option value="">{t.all}</option>
              {canIT && <option value="it">{dict.ticket.fields.it}</option>}
              {canMaintenance && (
                <option value="maintenance">{dict.ticket.fields.maintenance}</option>
              )}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t.status}</span>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className={selectClass}
            >
              <option value="">{t.allStatuses}</option>
              <option value="all">{t.all}</option>
              <option value="open">{dict.common.open}</option>
              <option value="in_progress">{dict.common.inProgress}</option>
              <option value="closed">{dict.common.closed}</option>
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t.criticality}</span>
            <select
              name="criticality"
              defaultValue={params.criticality ?? ""}
              className={selectClass}
            >
              <option value="">{t.all}</option>
              {CRITICALITY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {dict.ticket.criticality[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t.unit}</span>
            <select
              name="unit"
              defaultValue={params.unit ?? ""}
              className={selectClass}
            >
              <option value="">{t.all}</option>
              {units.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t.assignee}</span>
            <select
              name="assignee"
              defaultValue={params.assignee ?? ""}
              className={selectClass}
            >
              <option value="">{t.all}</option>
              <option value="unassigned">{t.unassigned}</option>
              {assignableAdmins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={labelClass}>{t.from}</span>
              <input
                type="date"
                name="from"
                defaultValue={period.from ?? ""}
                className={selectClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t.to}</span>
              <input
                type="date"
                name="to"
                defaultValue={period.to ?? ""}
                className={selectClass}
              />
            </label>
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t.apply}
            </button>
            <a
              href={`/${locale}/admin/tickets`}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t.clear}
            </a>
          </div>
        </form>
      </details>

      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.ticket.empty}
        </p>
      ) : (
        <>
          <TicketsTable
            tickets={tickets}
            dict={dict}
            locale={locale}
            sort={params.sort}
            dir={params.dir}
          />
          <div className="space-y-3 lg:hidden">
            {tickets.map((tk) => (
              <TicketCard
                key={tk.id}
                ticket={tk}
                dict={dict}
                locale={locale}
                href={`/${locale}/admin/tickets/${tk.id}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
