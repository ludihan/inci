import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale, type Dict } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";
import { getDB, listUnits } from "@/lib/store";
import { features } from "@/lib/features";
import type { Admin, Complaint, Ticket, TicketStatus } from "@/lib/types";
import { StatusBadge, TicketTypeBadge } from "@/components/badges";
import { BarList, TrendChart } from "@/components/dashboard-charts";
import { PeriodRangeFilter } from "@/components/period-range-filter";

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
  dot,
}: {
  label: string;
  value: number;
  dot?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <p className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />}
        {label}
      </p>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
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
  searchParams: Promise<{
    period?: string;
    unitId?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const db = await getDB();
  const units = await listUnits();
  const allTickets = visibleTicketsFor(admin, db);

  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  const showType = canIT && canMaintenance;
  const canComplaints = isSuperAdmin(admin) && features.complaintsEnabled;
  const allComplaints = canComplaints
    ? db.complaints.filter((c) => isSuperAdmin(admin) || c.assignedToId === admin.id)
    : [];

  const {
    period: rawPeriod,
    unitId: rawUnitId,
    type: rawType,
    from: rawFrom,
    to: rawTo,
  } = await searchParams;
  const periodKey: PeriodKey = PERIOD_KEYS.includes(rawPeriod as PeriodKey)
    ? (rawPeriod as PeriodKey)
    : "30";
  const unitId = units.some((p) => p.id === rawUnitId) ? rawUnitId : undefined;
  const typeFilter =
    showType && (rawType === "it" || rawType === "maintenance") ? rawType : undefined;

  const isDate = (v: string | undefined): v is string =>
    !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const fromStr = isDate(rawFrom) ? rawFrom : "";
  const toStr = isDate(rawTo) ? rawTo : "";
  const customRange = Boolean(fromStr || toStr);

  const rangeStart = fromStr ? new Date(`${fromStr}T00:00:00`) : null;
  const rangeEnd = toStr ? new Date(`${toStr}T23:59:59.999`) : null;

  const days = PERIOD_DAYS[periodKey];
  const cutoff = customRange
    ? rangeStart
    : days === null
      ? null
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1));
          d.setHours(0, 0, 0, 0);
          return d;
        })();
  const until = customRange ? rangeEnd : null;

  const inRange = (createdAt: string) => {
    const t = new Date(createdAt);
    if (cutoff && t < cutoff) return false;
    if (until && t > until) return false;
    return true;
  };

  const tickets = allTickets.filter((t) => {
    if (!inRange(t.createdAt)) return false;
    if (unitId && t.unit?.id !== unitId) return false;
    if (typeFilter && t.type !== typeFilter) return false;
    return true;
  });
  const complaints = allComplaints.filter((c) => {
    if (!inRange(c.createdAt)) return false;
    if (unitId && c.unit?.id !== unitId) return false;
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

  const unitCounts = new Map<string, number>();
  for (const t of tickets) {
    if (!t.unit) continue;
    unitCounts.set(t.unit.name, (unitCounts.get(t.unit.name) ?? 0) + 1);
  }
  const unitData = Array.from(unitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value, colorClass: "bg-sky-500" }));

  const trend = buildTrend(tickets, customRange ? "all" : periodKey);

  const recentTickets = [...tickets]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  const recentComplaints = [...complaints]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const hasAnyModule = canIT || canMaintenance || canComplaints;

  const qs = (overrides: { period?: string; unitId?: string; type?: string }) => {
    const params = new URLSearchParams();
    const nextPeriod = "period" in overrides ? overrides.period : periodKey;
    const nextUnitId = "unitId" in overrides ? overrides.unitId : unitId;
    const nextType = "type" in overrides ? overrides.type : typeFilter;
    // Choosing a preset period drops any custom range; other filter links
    // keep the range in place.
    const keepRange = !("period" in overrides);
    if (nextPeriod && nextPeriod !== "30") params.set("period", nextPeriod);
    if (nextUnitId) params.set("unitId", nextUnitId);
    if (nextType) params.set("type", nextType);
    if (keepRange && fromStr) params.set("from", fromStr);
    if (keepRange && toStr) params.set("to", toStr);
    const query = params.toString();
    return `/${locale}/admin${query ? `?${query}` : ""}`;
  };

  const periodLabel = customRange
    ? dict.admin.dashboard.customRange
    : (dict.admin.dashboard[
        `period${periodKey === "all" ? "All" : periodKey}` as keyof typeof dict.admin.dashboard
      ] as string);

  return (
    <div>
      <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.admin.dashboard.welcome}, {admin.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.dashboard.subtitle}
        </p>
      </div>

      {!hasAnyModule ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {dict.admin.dashboard.permissionWarning}
        </p>
      ) : (
        <div className="space-y-8">
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            <FilterRow label={dict.admin.dashboard.periodLabel}>
              {PERIOD_KEYS.map((key) => (
                <FilterLink
                  key={key}
                  href={qs({ period: key })}
                  active={!customRange && periodKey === key}
                >
                  {
                    dict.admin.dashboard[
                      `period${key === "all" ? "All" : key}` as keyof typeof dict.admin.dashboard
                    ] as string
                  }
                </FilterLink>
              ))}
            </FilterRow>

            <FilterRow label={dict.admin.dashboard.customRange}>
              <PeriodRangeFilter
                dict={dict}
                locale={locale}
                from={fromStr}
                to={toStr}
              />
            </FilterRow>

            {showType && (
              <FilterRow label={dict.admin.dashboard.typeLabel}>
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
              </FilterRow>
            )}

            {units.length > 0 && (
              <FilterRow label={dict.admin.dashboard.unitLabel}>
                <FilterLink href={qs({ unitId: undefined })} active={!unitId}>
                  {dict.admin.dashboard.allUnits}
                </FilterLink>
                {units.map((p) => (
                  <FilterLink
                    key={p.id}
                    href={qs({ unitId: p.id })}
                    active={unitId === p.id}
                  >
                    {p.name}
                  </FilterLink>
                ))}
              </FilterRow>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard
              label={dict.admin.dashboard.totalTickets}
              value={tickets.length}
              dot="bg-zinc-900 dark:bg-zinc-100"
            />
            <StatCard
              label={dict.admin.dashboard.openTickets}
              dot="bg-emerald-500"
              value={openTickets.length}
            />
            <StatCard
              label={dict.admin.dashboard.inProgressTickets}
              dot="bg-amber-500"
              value={inProgressTickets.length}
            />
            <StatCard
              label={dict.admin.dashboard.closedTickets}
              dot="bg-zinc-400"
              value={closedTickets.length}
            />
            <StatCard
              label={dict.admin.dashboard.unassignedTickets}
              dot="bg-rose-500"
              value={unassignedTickets.length}
            />
            {canComplaints && (
              <StatCard
                label={dict.admin.dashboard.totalComplaints}
                dot="bg-sky-500"
                value={complaints.length}
              />
            )}
          </div>

          {openComplaints.length > 0 && canComplaints && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
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
              title={dict.admin.dashboard.byUnitTitle}
              data={unitData}
              emptyLabel={dict.admin.dashboard.byUnitEmpty}
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

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-28 shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
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
      className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.admin.dashboard.recentTickets}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
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
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.admin.dashboard.recentComplaints}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
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
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
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
