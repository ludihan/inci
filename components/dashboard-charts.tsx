"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Theme-aware text/surface tokens (see globals.css) — marks carry the data
// colour, text never does.
const INK = "var(--chart-ink)";
const INK_SOFT = "var(--chart-ink-soft)";
const MUTED = "var(--chart-muted)";
const GRID = "var(--chart-grid)";
const SURFACE = "var(--chart-surface)";
const CURSOR = "var(--chart-cursor)";
const ACCENT = "var(--accent)";

type NamedValue = { label: string; value: number; color?: string };

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {label}
    </p>
  );
}

function TooltipCard({
  rows,
}: {
  rows: { label: string; value: number | string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 whitespace-nowrap">
          {r.color && (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: r.color }}
            />
          )}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {r.value}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({
  title,
  points,
  emptyLabel,
  seriesLabel,
  peakLabel,
  action,
}: {
  title: string;
  points: { label: string; value: number }[];
  emptyLabel: string;
  /** Series name shown in the tooltip, e.g. "tickets". */
  seriesLabel?: string;
  /** Template with `{value}` and `{label}` placeholders, e.g. "peak of {value} on {label}". */
  peakLabel?: string;
  action?: React.ReactNode;
}) {
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const peak = points.reduce(
    (best, p) => (p.value > best.value ? p : best),
    points[0] ?? { label: "", value: 0 }
  );

  return (
    <Card title={title} action={action}>
      {points.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <>
          <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {total}
            </span>
            {peakLabel && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {peakLabel
                  .replace("{value}", String(peak.value))
                  .replace("{label}", peak.label)}
              </span>
            )}
          </div>
          <div className="h-[200px] w-full sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tick={{ fontSize: 11, fill: MUTED }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  width={36}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: MUTED }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: MUTED, strokeWidth: 1 }}
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <TooltipCard
                        rows={[
                          {
                            label: seriesLabel
                              ? `${seriesLabel} · ${payload[0].payload.label}`
                              : payload[0].payload.label,
                            value: payload[0].value as number,
                            color: "var(--accent)",
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}

export function CategoryBars({
  title,
  data,
  emptyLabel,
}: {
  title: string;
  data: NamedValue[];
  emptyLabel: string;
}) {
  return (
    <Card title={title}>
      {data.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div
          className="w-full"
          style={{ height: Math.max(120, data.length * 40 + 16) }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 32, bottom: 4, left: 0 }}
              barCategoryGap={10}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={104}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: INK_SOFT }}
                tickFormatter={(v: string) =>
                  v.length > 16 ? `${v.slice(0, 15)}…` : v
                }
              />
              <Tooltip
                cursor={{ fill: CURSOR }}
                content={({ active, payload }) =>
                  active && payload && payload.length ? (
                    <TooltipCard
                      rows={[
                        {
                          label: payload[0].payload.label,
                          value: payload[0].value as number,
                          color: payload[0].payload.color ?? ACCENT,
                        },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color ?? ACCENT} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fill: INK, fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function StatusDonut({
  title,
  data,
  emptyLabel,
  totalLabel,
}: {
  title: string;
  data: NamedValue[];
  emptyLabel: string;
  totalLabel: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card title={title}>
      {total === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="60%"
                  outerRadius="92%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke={SURFACE}
                  strokeWidth={2}
                  isAnimationActive
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color ?? ACCENT} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <TooltipCard
                        rows={[
                          {
                            label: `${payload[0].name} · ${Math.round(
                              ((payload[0].value as number) / total) * 100
                            )}%`,
                            value: payload[0].value as number,
                            color: payload[0].payload.color,
                          },
                        ]}
                      />
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {total}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {totalLabel}
              </span>
            </div>
          </div>
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
            {data.map((d) => (
              <li key={d.label} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: d.color ?? ACCENT }}
                />
                <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">
                  {d.label}
                </span>
                <span className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-50">
                  {d.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
