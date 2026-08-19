import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { features } from "@/lib/features";
import { getDB } from "@/lib/store";
import { TicketCard } from "@/components/ticket-card";
import { TicketsTable } from "@/components/tickets-table";
import { TicketCodeJump } from "@/components/ticket-code-jump";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
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

  const { type, status } = await searchParams;
  const typeFilter =
    type === "it" || type === "maintenance" ? type : undefined;
  const statusFilter =
    status === "open" || status === "in_progress" || status === "closed"
      ? status
      : undefined;

  const db = await getDB();
  const tickets = db.tickets
    .filter((t) => {
      if (t.type === "it" && !canIT) return false;
      if (t.type === "maintenance" && !canMaintenance) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {dict.admin.tickets.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {dict.admin.tickets.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterLink
            href={`/${locale}/admin/tickets`}
            active={!typeFilter && !statusFilter}
          >
            {dict.admin.tickets.allTypes}
          </FilterLink>
          {canIT && (
            <FilterLink
              href={`/${locale}/admin/tickets?type=it`}
              active={typeFilter === "it" && !statusFilter}
            >
              {dict.ticket.fields.it}
            </FilterLink>
          )}
          {canMaintenance && (
            <FilterLink
              href={`/${locale}/admin/tickets?type=maintenance`}
              active={typeFilter === "maintenance" && !statusFilter}
            >
              {dict.ticket.fields.maintenance}
            </FilterLink>
          )}
          <FilterLink
            href={`/${locale}/admin/tickets?status=open${typeFilter ? `&type=${typeFilter}` : ""}`}
            active={statusFilter === "open"}
          >
            {dict.admin.dashboard.openTickets}
          </FilterLink>
          <FilterLink
            href={`/${locale}/admin/tickets?status=in_progress${typeFilter ? `&type=${typeFilter}` : ""}`}
            active={statusFilter === "in_progress"}
          >
            {dict.admin.dashboard.inProgressTickets}
          </FilterLink>
          <FilterLink
            href={`/${locale}/admin/tickets?status=closed${typeFilter ? `&type=${typeFilter}` : ""}`}
            active={statusFilter === "closed"}
          >
            {dict.admin.dashboard.closedTickets}
          </FilterLink>
        </div>
        <TicketCodeJump dict={dict} locale={locale} />
      </div>

      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.ticket.empty}
        </p>
      ) : (
        <>
          <TicketsTable tickets={tickets} dict={dict} locale={locale} />
          <div className="space-y-3 lg:hidden">
            {tickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                dict={dict}
                locale={locale}
                href={`/${locale}/admin/tickets/${t.id}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </a>
  );
}
