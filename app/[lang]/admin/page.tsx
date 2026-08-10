import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale, type Dict } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { getDB } from "@/lib/store";
import type { Admin } from "@/lib/types";
import { StatusBadge, TicketTypeBadge } from "@/components/badges";

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        accent
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p
        className={`text-sm ${
          accent
            ? "text-zinc-300 dark:text-zinc-600"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function visibleTicketsFor(admin: Admin, db: Awaited<ReturnType<typeof getDB>>) {
  const canIT = hasPermission(admin, "it");
  const canMaintenance = hasPermission(admin, "maintenance");
  return db.tickets.filter((t) =>
    t.type === "it" ? canIT : canMaintenance
  );
}

export default async function AdminDashboardPage() {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const db = await getDB();
  const tickets = visibleTicketsFor(admin, db);
  const openTickets = tickets.filter((t) => t.status === "open");
  const closedTickets = tickets.filter((t) => t.status === "closed");
  const canComplaints = hasPermission(admin, "complaints");
  const complaints = canComplaints ? db.complaints : [];
  const openComplaints = complaints.filter((c) => c.status === "open");

  const recentTickets = [...tickets]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const recentComplaints = [...complaints]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const hasAnyModule =
    hasPermission(admin, "it") ||
    hasPermission(admin, "maintenance") ||
    canComplaints;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.admin.dashboard.welcome}, {admin.name} 👋
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.dashboard.subtitle}
        </p>
      </div>

      {!hasAnyModule ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {dict.admin.dashboard.permissionWarning}
        </p>
      ) : (
        <div className="space-y-8">
          <div
            className={`grid grid-cols-2 gap-4 ${
              canComplaints ? "lg:grid-cols-4" : "lg:grid-cols-3"
            }`}
          >
            <StatCard
              label={dict.admin.dashboard.totalTickets}
              value={tickets.length}
              accent
            />
            <StatCard
              label={dict.admin.dashboard.openTickets}
              value={openTickets.length}
            />
            <StatCard
              label={dict.admin.dashboard.closedTickets}
              value={closedTickets.length}
            />
            {canComplaints && (
              <StatCard
                label={dict.admin.dashboard.totalComplaints}
                value={complaints.length}
              />
            )}
          </div>

          {openComplaints.length > 0 && canComplaints && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <span className="font-semibold">{openComplaints.length}</span>{" "}
              {dict.admin.dashboard.openComplaints}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentTickets
              tickets={recentTickets}
              dict={dict}
              locale={locale}
              href={`/${locale}/admin/tickets`}
            />
            {canComplaints && (
              <RecentComplaints
                complaints={recentComplaints}
                dict={dict}
                locale={locale}
                href={`/${locale}/admin/complaints`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentTickets({
  tickets,
  dict,
  locale,
  href,
}: {
  tickets: Awaited<ReturnType<typeof getDB>>["tickets"];
  dict: Dict;
  locale: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.admin.dashboard.recentTickets}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
        >
          {dict.admin.dashboard.viewAll}
        </Link>
      </div>
      {tickets.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.admin.dashboard.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <Link
                  href={`/${locale}/admin/tickets/${t.id}`}
                  className="block truncate font-mono text-sm font-bold text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {t.id}
                </Link>
                <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {t.subject}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <TicketTypeBadge type={t.type} dict={dict} />
                <StatusBadge status={t.status} dict={dict} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentComplaints({
  complaints,
  dict,
  locale,
  href,
}: {
  complaints: Awaited<ReturnType<typeof getDB>>["complaints"];
  dict: Dict;
  locale: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.admin.dashboard.recentComplaints}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
        >
          {dict.admin.dashboard.viewAll}
        </Link>
      </div>
      {complaints.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.admin.dashboard.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {complaints.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <Link
                  href={`/${locale}/admin/complaints/${encodeURIComponent(c.code)}`}
                  className="block truncate font-mono text-sm font-bold text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {c.code}
                </Link>
                <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {c.content}
                </p>
              </div>
              <StatusBadge status={c.status} dict={dict} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
