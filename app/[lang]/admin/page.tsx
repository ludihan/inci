import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale, type Dict, type Locale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";
import { getDB, listAreas, listUnits } from "@/lib/store";
import { features } from "@/lib/features";
import { computeIndicators, pct } from "@/lib/indicators";
import { requestTime } from "@/lib/sla";
import type { Admin, Complaint, Ticket, TicketCriticality } from "@/lib/types";
import { CRITICALITY_ORDER, StatusBadge } from "@/components/badges";
import { ColumnChart, ShareDonut } from "@/components/dashboard-charts";
import { PeriodRangeFilter } from "@/components/period-range-filter";
import { SlaBadge } from "@/components/sla-badge";

const PERIOD_KEYS = ["7", "30", "90", "all"] as const;
type PeriodKey = (typeof PERIOD_KEYS)[number];
const PERIOD_DAYS: Record<PeriodKey, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
};

// Same colors as the criticality badges.
const CRITICALITY_HEX: Record<TicketCriticality, string> = {
  critica: "#dc2626",
  urgente: "#f97316",
  medio: "#f59e0b",
  baixo: "#a1a1aa",
};

// Validated colorblind-safe categorical palette in fixed order. Each unit keeps
// its color by catalog position so filtering never repaints slices; from the
// 9th unit onward they group under "Others".
const UNIT_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
];
const OTHER_COLOR = "#a1a1aa";

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "danger" | "good";
}) {
  const box = {
    default:
      "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
    accent:
      "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900",
    danger:
      "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
    good:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  }[tone];
  const sub =
    tone === "accent"
      ? "text-white/75 dark:text-zinc-600"
      : "text-zinc-500 dark:text-zinc-400";
  const num =
    tone === "danger"
      ? "text-red-700 dark:text-red-300"
      : tone === "good"
        ? "text-emerald-800 dark:text-emerald-300"
        : tone === "accent"
          ? ""
          : "text-zinc-900 dark:text-zinc-50";

  return (
    <div className={`min-w-0 rounded-xl border p-4 shadow-xs ${box}`}>
      <p className={`text-xs font-medium leading-snug break-words hyphens-auto sm:text-sm ${sub}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl ${num}`}>
        {value}
      </p>
      {hint && <p className={`mt-0.5 text-xs leading-snug ${sub}`}>{hint}</p>}
    </div>
  );
}

type IndicatorRow = { label: string; value: number; color?: string };

/**
 * A table of counts. Like the charts above it, it only lists what has
 * tickets: zero rows are dropped (with a one-line note of how many), a
 * section with nothing becomes a single line, and an empty period is just
 * the "no data" message.
 */
function IndicatorTable({
  title,
  head,
  sections,
  total,
  dict,
}: {
  title: string;
  head: string;
  sections: {
    label?: string;
    rows: IndicatorRow[];
    zeroNoun?: { one: string; many: string };
  }[];
  total: number;
  dict: Dict;
}) {
  const d = dict.admin.dashboard;
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 sm:px-5 sm:text-base dark:border-zinc-800 dark:text-zinc-50">
        {title}
      </h2>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {d.noDataInPeriod}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              <th className="px-4 py-2 sm:px-5">{head}</th>
              <th className="w-24 px-2 py-2 text-right">{d.qtyHead}</th>
              <th className="w-20 px-4 py-2 text-right sm:px-5">%</th>
            </tr>
          </thead>
          {sections.map((section, si) => {
            const rows = section.rows.filter((row) => row.value > 0);
            const zeros = section.rows.length - rows.length;
            return (
              <tbody
                key={si}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                {section.label && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 sm:px-5 dark:text-zinc-400"
                    >
                      {section.label}
                    </td>
                  </tr>
                )}
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-zinc-400 sm:px-5 dark:text-zinc-500"
                    >
                      {d.noTicketsInSection}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-t border-zinc-50 first:border-t-0 dark:border-zinc-900"
                    >
                      <td className="px-4 py-2 sm:px-5">
                        <span className="flex items-center gap-2">
                          {row.color && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                              style={{ backgroundColor: row.color }}
                            />
                          )}
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {row.label}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {row.value}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-zinc-500 sm:px-5 dark:text-zinc-400">
                        {pct(row.value, total)}
                      </td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && zeros > 0 && section.zeroNoun && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 pb-2.5 pt-1 text-xs text-zinc-400 sm:px-5 dark:text-zinc-500"
                    >
                      {zeros === 1
                        ? d.hiddenZeroOne.replace("{noun}", section.zeroNoun.one)
                        : d.hiddenZeroMany
                            .replace("{count}", String(zeros))
                            .replace("{noun}", section.zeroNoun.many)}
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-bold dark:border-zinc-800 dark:bg-zinc-900/60">
              <td className="px-4 py-2.5 text-zinc-900 sm:px-5 dark:text-zinc-50">
                {d.totalTickets}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                {total}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500 sm:px-5 dark:text-zinc-400">
                100%
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function visibleTicketsFor(admin: Admin, db: Awaited<ReturnType<typeof getDB>>) {
  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  return db.tickets.filter((t) => (t.type === "it" ? canIT : canMaintenance));
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

  const [db, units, areas] = await Promise.all([
    getDB(),
    listUnits(),
    listAreas(),
  ]);
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

  const now = requestTime();
  const ind = computeIndicators(tickets, units, areas, now);
  const total = ind.total;
  const lateOpen = ind.late;
  const closedOnTime = ind.closedOnTime;
  const closedCount = ind.closed;
  const openComplaints = complaints.filter((c) => c.status === "open");
  const recentComplaints = [...complaints]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const d = dict.admin.dashboard;

  const areaRows: IndicatorRow[] = ind.areas.map((r) => ({
    label: r.label,
    value: r.value,
  }));
  if (ind.noArea) {
    areaRows.push({ label: d.noArea, value: ind.noArea, color: OTHER_COLOR });
  }

  const unitRows: IndicatorRow[] = ind.units.map((r, i) => ({
    label: r.label,
    value: r.value,
    color: i < UNIT_COLORS.length ? UNIT_COLORS[i] : OTHER_COLOR,
  }));
  const noUnit = ind.noUnit;
  const namedUnits = unitRows
    .slice(0, UNIT_COLORS.length)
    .filter((r) => r.value > 0);
  const otherUnitsCount =
    unitRows
      .slice(UNIT_COLORS.length)
      .reduce((sum, r) => sum + r.value, 0) + noUnit;
  const unitSlices = otherUnitsCount
    ? [...namedUnits, { label: d.otherUnits, value: otherUnitsCount, color: OTHER_COLOR }]
    : namedUnits;

  const criticalityRows: IndicatorRow[] = CRITICALITY_ORDER.map((c) => ({
    label: dict.ticket.criticality[c],
    value: ind.criticality[c],
    color: CRITICALITY_HEX[c],
  }));

  const hasAnyModule = canIT || canMaintenance || canComplaints;

  const qs = (overrides: { period?: string; unitId?: string; type?: string }) => {
    const params = new URLSearchParams();
    const nextPeriod = "period" in overrides ? overrides.period : periodKey;
    const nextUnitId = "unitId" in overrides ? overrides.unitId : unitId;
    const nextType = "type" in overrides ? overrides.type : typeFilter;
    const keepRange = !("period" in overrides);
    if (nextPeriod && nextPeriod !== "30") params.set("period", nextPeriod);
    if (nextUnitId) params.set("unitId", nextUnitId);
    if (nextType) params.set("type", nextType);
    if (keepRange && fromStr) params.set("from", fromStr);
    if (keepRange && toStr) params.set("to", toStr);
    const query = params.toString();
    return `/${locale}/admin${query ? `?${query}` : ""}`;
  };

  return (
    <div>
      <div className="mb-6 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {d.welcome}, {admin.name}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          {d.subtitle}
        </p>
      </div>

      {!hasAnyModule ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {d.permissionWarning}
        </p>
      ) : (
        <div className="space-y-6">
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            <FilterRow label={d.periodLabel}>
              {PERIOD_KEYS.map((key) => (
                <FilterLink
                  key={key}
                  href={qs({ period: key })}
                  active={!customRange && periodKey === key}
                >
                  {
                    d[
                      `period${key === "all" ? "All" : key}` as keyof typeof d
                    ] as string
                  }
                </FilterLink>
              ))}
            </FilterRow>

            <FilterRow label={d.customRange}>
              <PeriodRangeFilter
                dict={dict}
                locale={locale}
                from={fromStr}
                to={toStr}
              />
            </FilterRow>

            {showType && (
              <FilterRow label={d.typeLabel}>
                <FilterLink href={qs({ type: undefined })} active={!typeFilter}>
                  {d.allTypes}
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
              <FilterRow label={d.unitLabel}>
                <FilterLink href={qs({ unitId: undefined })} active={!unitId}>
                  {d.allUnits}
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

          <div className="@container">
            <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @lg:gap-4 @5xl:grid-cols-6">
              <StatCard label={d.totalTickets} value={total} tone="accent" />
              <StatCard label={d.openShort} value={ind.open} />
              <StatCard label={d.inProgressShort} value={ind.inProgress} />
              <StatCard label={d.closedShort} value={closedCount} />
              <StatCard
                label={d.overdueTickets}
                value={lateOpen.length}
                hint={d.overdueHint}
                tone={lateOpen.length ? "danger" : "default"}
              />
              <StatCard
                label={d.closedOnTime}
                value={closedCount ? pct(closedOnTime, closedCount) : "—"}
                hint={
                  closedCount
                    ? d.closedOnTimeHint
                        .replace("{onTime}", String(closedOnTime))
                        .replace("{total}", String(closedCount))
                    : d.noneClosed
                }
                tone={
                  closedCount && closedOnTime / closedCount >= 0.8
                    ? "good"
                    : "default"
                }
              />
            </div>
          </div>

          {openComplaints.length > 0 && canComplaints && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <span className="font-semibold">{openComplaints.length}</span>{" "}
              {d.openComplaints}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ColumnChart
              title={d.byAreaTitle}
              data={areaRows}
              emptyLabel={d.byAreaEmpty}
            />
            <ShareDonut
              title={d.byUnitChartTitle}
              data={unitSlices}
              emptyLabel={d.noDataInPeriod}
              totalLabel={d.chartTickets}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IndicatorTable
              title={d.indicatorsTitle}
              head={d.indicatorHead}
              total={total}
              dict={dict}
              sections={[
                {
                  label: d.areaSection,
                  rows: areaRows.map(({ label, value }) => ({ label, value })),
                  zeroNoun: { one: d.zeroAreaOne, many: d.zeroAreaMany },
                },
                {
                  label: d.criticalitySection,
                  rows: criticalityRows,
                  zeroNoun: {
                    one: d.zeroCriticalityOne,
                    many: d.zeroCriticalityMany,
                  },
                },
              ]}
            />
            <IndicatorTable
              title={d.byUnitChartTitle}
              head={d.unitHead}
              total={total}
              dict={dict}
              sections={[
                {
                  rows: [
                    ...unitRows,
                    ...(noUnit
                      ? [{ label: d.noUnit, value: noUnit, color: OTHER_COLOR }]
                      : []),
                  ],
                  zeroNoun: { one: d.zeroUnitOne, many: d.zeroUnitMany },
                },
              ]}
            />
          </div>

          <LateTickets
            tickets={lateOpen.slice(0, 8)}
            totalLate={lateOpen.length}
            serverNow={now}
            dict={dict}
            locale={locale}
          />

          {canComplaints && recentComplaints.length > 0 && (
            <RecentComplaints
              complaints={recentComplaints}
              dict={dict}
              locale={locale}
              href={`/${locale}/admin/complaints`}
            />
          )}
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

function LateTickets({
  tickets,
  totalLate,
  serverNow,
  dict,
  locale,
}: {
  tickets: Ticket[];
  totalLate: number;
  serverNow: number;
  dict: Dict;
  locale: Locale;
}) {
  const d = dict.admin.dashboard;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 sm:text-base dark:text-zinc-50">
          {d.lateTicketsTitle}
          {totalLate > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              {totalLate}
            </span>
          )}
        </h2>
        <Link
          href={`/${locale}/admin/tickets`}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          {d.viewTickets}
        </Link>
      </div>
      {tickets.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {d.noLateTickets}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/${locale}/admin/tickets/${t.id}`}
                className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <SlaBadge
                  ticket={t}
                  serverNow={serverNow}
                  locale={locale}
                  showDeadline={false}
                />
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
                  {t.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {t.subject || t.equipment || t.messages[0]?.content}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {[t.unit?.name, t.assignedToName ?? d.unassignedShort]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
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
  locale: Locale;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 sm:text-base dark:text-zinc-50">
          {dict.admin.dashboard.recentComplaints}
        </h2>
        <Link
          href={href}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          {dict.admin.dashboard.viewAll}
        </Link>
      </div>
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
    </div>
  );
}
