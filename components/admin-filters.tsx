"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  EMPTY_FILTERS,
  FILTERS_COOKIE,
  FILTER_CRITICALITIES,
  FILTER_STATUSES,
  activeFilterCount,
  clearFilter,
  serializeFilters,
  type AdminFilters,
  type FilterKey,
} from "@/lib/admin-filters";
import { FILTERS_PANEL_COOKIE } from "@/lib/admin-panels";
import { SLA_FILTERS, type SlaFilter } from "@/lib/sla";
import type { FilterOptions } from "@/lib/admin-filters-server";
import type { TicketCriticality, TicketStatus, TicketType } from "@/lib/types";
import { DateRangeInputs } from "@/components/period-filter";
import {
  setPreferenceCookie,
  useIsDesktop,
  writePanelCookie,
} from "@/components/use-panels";

export interface FilterPanelLabels {
  title: string;
  hint: string;
  open: string;
  collapse: string;
  close: string;
  clear: string;
  clearAll: string;
  clearOne: string;
  clearMany: string;
  noneActive: string;
  inUse: string;
  period: string;
  from: string;
  to: string;
  presets: {
    today: string;
    days7: string;
    days30: string;
    thisMonth: string;
    lastMonth: string;
    thisYear: string;
  };
  status: string;
  statuses: Record<TicketStatus, string>;
  deadline: string;
  deadlines: Record<SlaFilter, string>;
  criticality: string;
  criticalities: Record<TicketCriticality, string>;
  type: string;
  types: Record<TicketType, string>;
  unit: string;
  area: string;
  assignee: string;
  all: string;
  unassigned: string;
}

// Pages that read the global filters; the panel and its button only show there.
export function isFilterRoute(pathname: string): boolean {
  return /^\/(pt|en)\/admin(\/tickets(\/.*)?)?$/.test(pathname);
}

interface FiltersContextValue {
  filters: AdminFilters;
  setFilters: (next: AdminFilters) => void;
  options: FilterOptions;
  labels: FilterPanelLabels;
  count: number;
  pending: boolean;
  open: boolean;
  desktopOpen: boolean;
  mobileOpen: boolean;
  setOpen: (open: boolean) => void;
  /** The panel is showing on this page (desktop: taking room on the right). */
  visibleHere: boolean;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function useAdminFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useAdminFilters outside AdminFiltersProvider");
  return ctx;
}

export function useOptionalAdminFilters(): FiltersContextValue | null {
  return useContext(FiltersContext);
}

function writeFiltersCookie(f: AdminFilters): void {
  setPreferenceCookie(FILTERS_COOKIE, serializeFilters(f));
}

export function AdminFiltersProvider({
  initialFilters,
  options,
  labels,
  initialOpen,
  children,
}: {
  initialFilters: AdminFilters;
  options: FilterOptions;
  labels: FilterPanelLabels;
  initialOpen: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [filters, setLocal] = useState(initialFilters);
  const [desktopOpen, setDesktopOpen] = useState(initialOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const setFilters = (next: AdminFilters) => {
    setLocal(next);
    writeFiltersCookie(next);
    const url = new URL(window.location.href);
    startTransition(() => {
      if (url.searchParams.has("page")) {
        url.searchParams.delete("page");
        router.replace(`${url.pathname}${url.search}`, { scroll: false });
      } else {
        router.refresh();
      }
    });
  };

  const open = isDesktop ? desktopOpen : mobileOpen;
  const setOpen = (value: boolean) => {
    if (isDesktop) {
      setDesktopOpen(value);
      writePanelCookie(FILTERS_PANEL_COOKIE, value);
    } else {
      setMobileOpen(value);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  const filterRoute = isFilterRoute(pathname);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        setFilters,
        options,
        labels,
        count: activeFilterCount(filters),
        pending,
        open,
        desktopOpen,
        mobileOpen,
        setOpen,
        visibleHere: filterRoute && desktopOpen,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

const FUNNEL =
  "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z";

function FunnelIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={FUNNEL} />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

function ClearX({
  onClick,
  label,
  className = "",
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid place-items-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 ${className}`}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="3"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

/** Phones: top-bar button that opens the panel, with the count and a clear ×. */
export function FilterPanelToggle() {
  const pathname = usePathname();
  const { count, open, setOpen, pending, setFilters, labels } = useAdminFilters();
  if (!isFilterRoute(pathname)) return null;
  const active = count > 0;
  return (
    <span
      className={`inline-flex items-center rounded-lg border text-sm font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900/5 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100/10 dark:text-zinc-50"
          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="admin-filters"
        className="inline-flex items-center gap-2 px-3 py-1.5"
      >
        {pending ? <Spinner /> : <FunnelIcon />}
        {labels.title}
        {active && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-zinc-900 px-1.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {count}
          </span>
        )}
      </button>
      {active && (
        <ClearX
          onClick={() => setFilters({ ...EMPTY_FILTERS })}
          label={labels.clearAll}
          className="mr-1 h-6 w-6"
        />
      )}
    </span>
  );
}

/**
 * Desktop: the filter panel's header, docked in the top bar's right corner.
 * Clicking anywhere on it opens or folds the panel below it.
 */
export function FilterPanelHeader() {
  const pathname = usePathname();
  const { count, desktopOpen, setOpen, pending, setFilters, labels } =
    useAdminFilters();
  if (!isFilterRoute(pathname)) return null;
  const toggleLabel = desktopOpen ? labels.collapse : labels.open;
  return (
    <div className="group relative hidden w-72 shrink-0 items-center gap-2 border-l border-zinc-200 px-4 transition-colors hover:bg-zinc-50 lg:flex dark:border-zinc-800 dark:hover:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen(!desktopOpen)}
        aria-expanded={desktopOpen}
        aria-controls="admin-filters"
        aria-label={toggleLabel}
        title={toggleLabel}
        className="absolute inset-0"
      />
      <span className="pointer-events-none flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {pending ? (
          <Spinner />
        ) : (
          <FunnelIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        )}
        {labels.title}
        {count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-zinc-900 px-1.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {count}
          </span>
        )}
      </span>
      {count > 0 && (
        <ClearX
          onClick={() => setFilters({ ...EMPTY_FILTERS })}
          label={labels.clearAll}
          className="relative z-10 h-6 w-6"
        />
      )}
      <span className="pointer-events-none ml-auto rounded-md p-1.5 text-zinc-500 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-50">
        <svg
          className={`h-4 w-4 transition-transform duration-300 ease-panel ${desktopOpen ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </div>
  );
}

// ---- the panel ----

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presets(
  p: FilterPanelLabels["presets"]
): { key: string; label: string; from: string; to: string }[] {
  const now = new Date();
  const today = isoLocal(now);
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return isoLocal(d);
  };
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    { key: "today", label: p.today, from: today, to: today },
    { key: "7", label: p.days7, from: daysAgo(6), to: today },
    { key: "30", label: p.days30, from: daysAgo(29), to: today },
    {
      key: "month",
      label: p.thisMonth,
      from: isoLocal(new Date(y, m, 1)),
      to: isoLocal(new Date(y, m + 1, 0)),
    },
    {
      key: "lastMonth",
      label: p.lastMonth,
      from: isoLocal(new Date(y, m - 1, 1)),
      to: isoLocal(new Date(y, m, 0)),
    },
    { key: "year", label: p.thisYear, from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

function Chip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
      }`}
    >
      {dot && (
        <span
          className={`h-2 w-2 rounded-full ${active ? "bg-white dark:bg-zinc-900" : dot}`}
        />
      )}
      {children}
    </button>
  );
}

function Section({
  title,
  active,
  clearLabel,
  inUseLabel,
  onClear,
  children,
}: {
  title: string;
  active: boolean;
  clearLabel: string;
  inUseLabel: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-zinc-100 px-4 py-3.5 last:border-b-0 dark:border-zinc-800/80">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          {title}
          {active && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent"
              aria-label={inUseLabel}
            />
          )}
        </h3>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {clearLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

const STATUS_DOT: Record<TicketStatus, string> = {
  open: "bg-emerald-500",
  in_progress: "bg-amber-500",
  closed: "bg-zinc-400",
};
const SLA_DOT: Record<SlaFilter, string> = {
  late: "bg-red-600",
  due_soon: "bg-amber-500",
  on_time: "bg-emerald-500",
};
const CRITICALITY_DOT: Record<TicketCriticality, string> = {
  critica: "bg-red-600",
  urgente: "bg-orange-500",
  medio: "bg-amber-500",
  baixo: "bg-zinc-400",
};

export function FilterPanel() {
  const pathname = usePathname();
  const {
    filters,
    setFilters,
    options,
    labels,
    count,
    pending,
    open,
    desktopOpen,
    mobileOpen,
    setOpen,
  } = useAdminFilters();
  const filterRoute = isFilterRoute(pathname);
  const shown = filterRoute && open;

  const update = (patch: Partial<AdminFilters>) =>
    setFilters({ ...filters, ...patch });
  const clear = (key: FilterKey) => setFilters(clearFilter(filters, key));

  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !window.matchMedia("(min-width: 1024px)").matches) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shown, setOpen]);

  if (!filterRoute) return null;

  const periodPresets = presets(labels.presets);

  return (
    <>
      <button
        type="button"
        aria-label={labels.close}
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[45] bg-black/40 transition-opacity duration-300 ease-out lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="admin-filters"
        aria-label={labels.title}
        inert={!shown}
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[88%] flex-col border-l border-zinc-200 bg-white shadow-xl transition-transform duration-300 ease-panel will-change-transform motion-reduce:transition-none lg:top-14 lg:z-30 lg:max-w-none lg:shadow-none dark:border-zinc-800 dark:bg-zinc-950 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        } ${desktopOpen ? "lg:translate-x-0" : "lg:translate-x-full"}`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={labels.close}
          title={labels.close}
          className="group flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 text-left transition-colors hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {pending ? (
              <Spinner />
            ) : (
              <FunnelIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            )}
            {labels.title}
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-zinc-900 px-1.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {count}
              </span>
            )}
          </span>
          <span className="rounded-md p-1.5 text-zinc-500 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-50">
            <svg
              className="h-4 w-4 transition-transform duration-300 ease-panel group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </button>

        <p className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          {labels.hint}
        </p>

        <div className="flex-1 overflow-y-auto">
          <Section
            title={labels.period}
            active={Boolean(filters.from || filters.to)}
            clearLabel={labels.clear}
            inUseLabel={labels.inUse}
            onClear={() => clear("period")}
          >
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {periodPresets.map((p) => (
                <Chip
                  key={p.key}
                  active={filters.from === p.from && filters.to === p.to}
                  onClick={() =>
                    filters.from === p.from && filters.to === p.to
                      ? clear("period")
                      : update({ from: p.from, to: p.to })
                  }
                >
                  {p.label}
                </Chip>
              ))}
            </div>
            <DateRangeInputs
              from={filters.from}
              to={filters.to}
              fromLabel={labels.from}
              toLabel={labels.to}
              onChange={(from, to) => update({ from, to })}
            />
          </Section>

          <Section
            title={labels.status}
            active={filters.statuses.length > 0}
            clearLabel={labels.clear}
            inUseLabel={labels.inUse}
            onClear={() => clear("statuses")}
          >
            <div className="flex flex-wrap gap-1.5">
              {FILTER_STATUSES.map((s) => (
                <Chip
                  key={s}
                  dot={STATUS_DOT[s]}
                  active={filters.statuses.includes(s)}
                  onClick={() => update({ statuses: toggle(filters.statuses, s) })}
                >
                  {labels.statuses[s]}
                </Chip>
              ))}
            </div>
          </Section>

          <Section
            title={labels.deadline}
            active={filters.deadline.length > 0}
            clearLabel={labels.clear}
            inUseLabel={labels.inUse}
            onClear={() => clear("deadline")}
          >
            <div className="flex flex-wrap gap-1.5">
              {SLA_FILTERS.map((x) => (
                <Chip
                  key={x}
                  dot={SLA_DOT[x]}
                  active={filters.deadline.includes(x)}
                  onClick={() => update({ deadline: toggle(filters.deadline, x) })}
                >
                  {labels.deadlines[x]}
                </Chip>
              ))}
            </div>
          </Section>

          <Section
            title={labels.criticality}
            active={filters.criticalities.length > 0}
            clearLabel={labels.clear}
            inUseLabel={labels.inUse}
            onClear={() => clear("criticalities")}
          >
            <div className="flex flex-wrap gap-1.5">
              {FILTER_CRITICALITIES.map((c) => (
                <Chip
                  key={c}
                  dot={CRITICALITY_DOT[c]}
                  active={filters.criticalities.includes(c)}
                  onClick={() =>
                    update({ criticalities: toggle(filters.criticalities, c) })
                  }
                >
                  {labels.criticalities[c]}
                </Chip>
              ))}
            </div>
          </Section>

          {options.types.length > 1 && (
            <Section
              title={labels.type}
              active={filters.types.length > 0}
              clearLabel={labels.clear}
              inUseLabel={labels.inUse}
              onClear={() => clear("types")}
            >
              <div className="flex flex-wrap gap-1.5">
                {options.types.map((t) => (
                  <Chip
                    key={t}
                    active={filters.types.includes(t)}
                    onClick={() => update({ types: toggle(filters.types, t) })}
                  >
                    {labels.types[t]}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {options.units.length > 0 && (
            <Section
              title={labels.unit}
              active={filters.units.length > 0}
              clearLabel={labels.clear}
              inUseLabel={labels.inUse}
              onClear={() => clear("units")}
            >
              <div className="flex flex-wrap gap-1.5">
                {options.units.map((u) => (
                  <Chip
                    key={u.id}
                    active={filters.units.includes(u.id)}
                    onClick={() => update({ units: toggle(filters.units, u.id) })}
                  >
                    {u.name}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {options.areas.length > 0 && (
            <Section
              title={labels.area}
              active={filters.areas.length > 0}
              clearLabel={labels.clear}
              inUseLabel={labels.inUse}
              onClear={() => clear("areas")}
            >
              <div className="flex flex-wrap gap-1.5">
                {options.areas.map((a) => (
                  <Chip
                    key={a.id}
                    active={filters.areas.includes(a.id)}
                    onClick={() => update({ areas: toggle(filters.areas, a.id) })}
                  >
                    {a.name}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          <Section
            title={labels.assignee}
            active={Boolean(filters.assignee)}
            clearLabel={labels.clear}
            inUseLabel={labels.inUse}
            onClear={() => clear("assignee")}
          >
            <select
              value={filters.assignee}
              onChange={(e) => update({ assignee: e.target.value })}
              className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm shadow-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900 ${
                filters.assignee
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50"
                  : "border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              }`}
            >
              <option value="">{labels.all}</option>
              <option value="unassigned">{labels.unassigned}</option>
              {options.assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Section>
        </div>

        <div className="shrink-0 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <button
            type="button"
            disabled={count === 0}
            onClick={() => setFilters({ ...EMPTY_FILTERS })}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600"
          >
            {count === 0
              ? labels.noneActive
              : count === 1
                ? labels.clearOne
                : labels.clearMany.replace("{count}", String(count))}
          </button>
        </div>
      </aside>
    </>
  );
}
