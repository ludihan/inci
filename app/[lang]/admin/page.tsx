import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale, type Dict } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";
import { getDB, listPlaces } from "@/lib/store";
import { features } from "@/lib/features";
import type { Admin, Complaint, Ticket, TicketStatus } from "@/lib/types";
import { StatusBadge, TicketTypeBadge } from "@/components/badges";
import { BarList, TrendChart } from "@/components/dashboard-charts";

const PERIOD_KEYS = ["7", "30", "90", "all"] as const;
type PeriodKey = (typeof PERIOD_KEYS)[number];
const PERIOD_DAYS: Record<PeriodKey, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  open: "bg-emerald-500",
  in_progress: "bg-amber-500",
  closed: "bg-zinc-400",
};

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
  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  return db.tickets.filter((t) => (t.type === "it" ? canIT : canMaintenance));
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function shortMonth(key: string): string {
  const [y, m] = key.split("-");
  return `${m}/${y.slice(2)}`;
}

function buildTrend(
  items: { createdAt: string }[],
  periodKey: PeriodKey
): { label: string; value: number }[] {
  const days = PERIOD_DAYS[periodKey];
  const now = new Date();
  if (days !== null) {
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const item of items) {
      const key = dayKey(item.createdAt);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([key, value]) => ({
      label: shortDay(key),
      value,
    }));
  }

  const buckets = new Map<string, number>();
  for (const item of items) {
    const key = monthKey(item.createdAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const keys = Array.from(buckets.keys()).sort();
  return keys.map((key) => ({ label: shortMonth(key), value: buckets.get(key) ?? 0 }));
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; placeId?: string; type?: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const db = await getDB();
  const places = await listPlaces();
  const allTickets = visibleTicketsFor(admin, db);

  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  const showType = canIT && canMaintenance;
  const canComplaints = isSuperAdmin(admin) && features.complaintsEnabled;
  const allComplaints = canComplaints
    ? db.complaints.filter((c) => isSuperAdmin(admin) || c.assignedToId === admin.id)
    : [];

  const { period: rawPeriod, placeId: rawPlaceId, type: rawType } = await searchParams;
  const periodKey: PeriodKey = PERIOD_KEYS.includes(rawPeriod as PeriodKey)
    ? (rawPeriod as PeriodKey)
    : "30";
  const placeId = places.some((p) => p.id === rawPlaceId) ? rawPlaceId : undefined;
  const typeFilter =
    showType && (rawType === "it" || rawType === "maintenance") ? rawType : undefined;

  const days = PERIOD_DAYS[periodKey];
  const cutoff =
    days === null
      ? null
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1));
          d.setHours(0, 0, 0, 0);
          return d;
        })();

  const tickets = allTickets.filter((t) => {
    if (cutoff && new Date(t.createdAt) < cutoff) return false;
    if (placeId && t.place?.id !== placeId) return false;
    if (typeFilter && t.type !== typeFilter) return false;
    return true;
  });
  const complaints = allComplaints.filter((c) => {
    if (cutoff && new Date(c.createdAt) < cutoff) return false;
    if (placeId && c.place?.id !== placeId) return false;
    return true;
  });

  const openTickets = tickets.filter((t) => t.status === "open");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const closedTickets = tickets.filter((t) => t.status === "closed");
  const unassignedTickets = tickets.filter(
    (t) => !t.assignedToId && t.status !== "closed"
  );
  const openComplaints = complaints.filter((c) => c.status === "open");

  const statusData = (["open", "in_progress", "closed"] as TicketStatus[]).map(
    (status) => ({
      label: dict.common[status === "in_progress" ? "inProgress" : status],
      value: tickets.filter((t) => t.status === status).length,
      colorClass: STATUS_COLOR[status],
    })
  );

  const placeCounts = new Map<string, number>();
  for (const t of tickets) {
    if (!t.place) continue;
    placeCounts.set(t.place.name, (placeCounts.get(t.place.name) ?? 0) + 1);
  }
  const placeData = Array.from(placeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, colorClass: "bg-sky-500" }));

  const trend = buildTrend(tickets, periodKey);

  const recentTickets = [...tickets]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  const recentComplaints = [...complaints]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const hasAnyModule = canIT || canMaintenance || canComplaints;

  const qs = (overrides: { period?: string; placeId?: string; type?: string }) => {
    const params = new URLSearchParams();
    const nextPeriod = "period" in overrides ? overrides.period : periodKey;
    const nextPlaceId = "placeId" in overrides ? overrides.placeId : placeId;
    const nextType = "type" in overrides ? overrides.type : typeFilter;
    if (nextPeriod && nextPeriod !== "30") params.set("period", nextPeriod);
    if (nextPlaceId) params.set("placeId", nextPlaceId);
    if (nextType) params.set("type", nextType);
    const query = params.toString();
    return `/${locale}/admin${query ? `?${query}` : ""}`;
  };

  const periodLabel = dict.admin.dashboard[
    `period${periodKey === "all" ? "All" : periodKey}` as keyof typeof dict.admin.dashboard
  ] as string;

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
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="mr-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {dict.admin.dashboard.periodLabel}
            </span>
            {PERIOD_KEYS.map((key) => (
              <FilterLink
                key={key}
                href={qs({ period: key })}
                active={periodKey === key}
              >
                {
                  dict.admin.dashboard[
                    `period${key === "all" ? "All" : key}` as keyof typeof dict.admin.dashboard
                  ] as string
                }
              </FilterLink>
            ))}

            {showType && (
              <>
                <span className="ml-3 mr-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {dict.admin.dashboard.typeLabel}
                </span>
                <FilterLink href={qs({ type: undefined })} active={!typeFilter}>
                  {dict.admin.dashboard.allTypes}
                </FilterLink>
                <FilterLink href={qs({ type: "it" })} active={typeFilter === "it"}>
                  {dict.ticket.fields.it}
                </FilterLink>
                <FilterLink
                  href={qs({ type: "maintenance" })}
                  active={typeFilter === "maintenance"}
                >
                  {dict.ticket.fields.maintenance}
                </FilterLink>
              </>
            )}

            {places.length > 0 && (
              <>
                <span className="ml-3 mr-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {dict.admin.dashboard.placeLabel}
                </span>
                <FilterLink href={qs({ placeId: undefined })} active={!placeId}>
                  {dict.admin.dashboard.allPlaces}
                </FilterLink>
                {places.map((p) => (
                  <FilterLink
                    key={p.id}
                    href={qs({ placeId: p.id })}
                    active={placeId === p.id}
                  >
                    {p.name}
                  </FilterLink>
                ))}
              </>
            )}
          </div>

          <div
            className={`grid grid-cols-2 gap-4 ${
              canComplaints ? "lg:grid-cols-6" : "lg:grid-cols-5"
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
              label={dict.admin.dashboard.inProgressTickets}
              value={inProgressTickets.length}
            />
            <StatCard
              label={dict.admin.dashboard.closedTickets}
              value={closedTickets.length}
            />
            <StatCard
              label={dict.admin.dashboard.unassignedTickets}
              value={unassignedTickets.length}
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

          <TrendChart
            title={`${dict.admin.dashboard.trendTitle} (${periodLabel.toLowerCase()})`}
            points={trend}
            emptyLabel={dict.admin.dashboard.noDataInPeriod}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarList
              title={dict.admin.dashboard.byStatusTitle}
              data={statusData}
              emptyLabel={dict.admin.dashboard.noDataInPeriod}
            />
            <BarList
              title={dict.admin.dashboard.byPlaceTitle}
              data={placeData}
              emptyLabel={dict.admin.dashboard.byPlaceEmpty}
            />
          </div>

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

function RecentTickets({
  tickets,
  dict,
  locale,
  href,
}: {
  tickets: Ticket[];
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
          {dict.admin.dashboard.emptyInPeriod}
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
  complaints: Complaint[];
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
          {dict.admin.dashboard.emptyInPeriod}
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
                  {c.subject}
                </p>
                <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
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
