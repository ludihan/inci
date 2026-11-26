"use client";

import { useEffect, useRef, useState } from "react";
import {
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
        <h2 className="text-sm font-semibold text-zinc-900 sm:text-base dark:text-zinc-50">
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

function HorizontalBars({ data }: { data: NamedValue[] }) {
  return (
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
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: INK_SOFT }}
            tickFormatter={(v: string) =>
              v.length > 24 ? `${v.slice(0, 23)}…` : v
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
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            barSize={18}
            isAnimationActive
          >
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
  );
}

// Splits a label into lines of at most `max` characters, breaking at spaces
// (a single long word is cut with an ellipsis). Two lines at most.
function wrapLabel(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= max) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  const out = lines
    .slice(0, 2)
    .map((l) => (l.length > max ? `${l.slice(0, Math.max(1, max - 1))}…` : l));
  if (lines.length > 2) out[1] = `${out[1].slice(0, Math.max(1, max - 1))}…`;
  return out;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Vertical columns for a handful of categories (every category shown, zeros
 * included). Falls back to horizontal bars when there are too many categories
 * to fit side by side.
 */
export function ColumnChart({
  title,
  data,
  emptyLabel,
}: {
  title: string;
  data: NamedValue[];
  emptyLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  // Room each column gets for its label; too little turns the chart sideways.
  const band = data.length ? (width - 28) / data.length : 0;
  const sideways = data.length > 6 || (width > 0 && band < 64);
  const maxChars = Math.max(4, Math.floor(band / 6.6));
  return (
    <Card title={title}>
      {data.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div ref={ref} className="w-full">
          {sideways ? (
            <HorizontalBars data={data} />
          ) : (
            <div className="h-[240px] w-full sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 22, right: 8, bottom: 0, left: -16 }}
                  barCategoryGap="28%"
                >
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    interval={0}
                    height={40}
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={Number(y) + 14}
                        textAnchor="middle"
                        fontSize={12}
                        fill={INK_SOFT}
                      >
                        <title>{payload.value}</title>
                        {wrapLabel(String(payload.value), maxChars).map(
                          (line, i) => (
                            <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
                              {line}
                            </tspan>
                          )
                        )}
                      </text>
                    )}
                  />
                  <YAxis
                    width={36}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: MUTED }}
                  />
                  <Tooltip
                    cursor={{ fill: CURSOR }}
                    content={({ active, payload }) =>
                      active && payload && payload.length ? (
                        <TooltipCard
                          rows={[
                            {
                              label: `${payload[0].payload.label}${
                                total
                                  ? ` · ${Math.round(((payload[0].value as number) / total) * 100)}%`
                                  : ""
                              }`,
                              value: payload[0].value as number,
                              color: payload[0].payload.color ?? ACCENT,
                            },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={56}
                    isAnimationActive
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color ?? ACCENT} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      style={{ fill: INK, fontSize: 12, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Donut with a legend carrying each slice's name, count and share. */
export function ShareDonut({
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
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <Card title={title}>
      {total === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="@container">
          <div className="flex flex-col items-center gap-5 @md:flex-row">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="58%"
                    outerRadius="94%"
                    paddingAngle={data.length > 1 ? 1.5 : 0}
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
                              label: `${payload[0].name} · ${pct(payload[0].value as number)}%`,
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
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {total}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {totalLabel}
                </span>
              </div>
            </div>
            <ul className="w-full min-w-0 space-y-1.5">
              {data.map((d) => (
                <li key={d.label} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: d.color ?? ACCENT }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300"
                    title={d.label}
                  >
                    {d.label}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {d.value}
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {pct(d.value)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
