import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { features } from "@/lib/features";
import { applyFilters } from "@/lib/admin-filters";
import { loadAdminFilters } from "@/lib/admin-filters-server";
import { PER_PAGE_COOKIE, parsePerPage } from "@/lib/admin-panels";
import { requestTime } from "@/lib/sla";
import { isAdminOpenTarget } from "@/lib/utils";
import { getDB } from "@/lib/store";
import { SORT_KEYS, sortTicketList } from "@/lib/ticket-list-filter";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { TicketCard } from "@/components/ticket-card";
import { TicketsTable } from "@/components/tickets-table";
import { TicketsLegend } from "@/components/tickets-legend";
import { TicketCodeJump } from "@/components/ticket-code-jump";
import { TicketsReportButton } from "@/components/tickets-report-button";
import { TicketsOsReportButton } from "@/components/tickets-os-report-button";

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
    const { abrir } = await searchParams;
    redirect(
      typeof abrir === "string" && isAdminOpenTarget(abrir)
        ? `/${locale}/admin/login?abrir=${encodeURIComponent(abrir)}`
        : `/${locale}/admin/login`
    );
  }

  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  if (!canIT && !canMaintenance) {
    redirect(`/${locale}/admin`);
  }

  const [sp, db, { filters }, cookieStore] = await Promise.all([
    searchParams,
    getDB(),
    loadAdminFilters(admin),
    cookies(),
  ]);

  const rawSort = one(sp.sort);
  const sort = rawSort && SORT_KEYS[rawSort] ? rawSort : undefined;
  const rawDir = one(sp.dir);
  const dir = rawDir === "asc" ? "asc" : rawDir === "desc" ? "desc" : undefined;
  const pageRaw = one(sp.page);

  const visible = db.tickets.filter((t) =>
    t.type === "it" ? canIT : canMaintenance
  );
  const tickets = sortTicketList(applyFilters(visible, filters), sort, dir);
  const serverNow = requestTime();

  const perPage = parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const totalPages = Math.max(1, Math.ceil(tickets.length / perPage));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(pageRaw)) || 1));
  const pageTickets = tickets.slice((page - 1) * perPage, page * perPage);

  const detail =
    locale === "pt"
      ? `${tickets.length} ${tickets.length === 1 ? "chamado" : "chamados"}`
      : `${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"}`;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        detail={detail}
        actions={
          <>
            <TicketCodeJump dict={dict} locale={locale} />
            <TicketsOsReportButton dict={dict} locale={locale} />
            <TicketsReportButton dict={dict} locale={locale} />
            <TicketsLegend dict={dict} locale={locale} />
          </>
        }
      />

      <div id="tickets-list" className="scroll-mt-20" />

      <TicketsTable
        tickets={pageTickets}
        dict={dict}
        locale={locale}
        sort={sort}
        dir={dir}
        serverNow={serverNow}
      />

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 lg:hidden dark:border-zinc-700 dark:text-zinc-400">
          {dict.admin.table.empty}
        </p>
      ) : (
        <div className="space-y-3 lg:hidden">
          {pageTickets.map((tk) => (
            <TicketCard
              key={tk.id}
              ticket={tk}
              dict={dict}
              locale={locale}
              href={`/${locale}/admin/tickets/${tk.id}`}
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        perPage={perPage}
        total={tickets.length}
        locale={locale}
      />
    </div>
  );
}
