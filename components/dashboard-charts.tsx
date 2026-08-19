export function BarList({
  title,
  data,
  emptyLabel,
}: {
  title: string;
  data: { label: string; value: number; colorClass: string }[];
  emptyLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((d) => {
            const pct = Math.max(2, Math.round((d.value / max) * 100));
            return (
              <li key={d.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                    {d.label}
                  </span>
                  <span className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-50">
                    {d.value}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                  role="img"
                  aria-label={`${d.label}: ${d.value}`}
                >
                  <div
                    className={`h-full rounded-full ${d.colorClass}`}
                    style={{ width: `${pct}%` }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function TrendChart({
  title,
  points,
  emptyLabel,
  colorClass = "text-sky-600 dark:text-sky-400",
}: {
  title: string;
  points: { label: string; value: number }[];
  emptyLabel: string;
  colorClass?: string;
}) {
  const width = 600;
  const height = 180;
  const padX = 8;
  const padTop = 16;
  const padBottom = 24;
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerWidth = width - padX * 2;
  const innerHeight = height - padTop - padBottom;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: padX + (points.length > 1 ? i * stepX : innerWidth / 2),
    y: padTop + innerHeight - (p.value / max) * innerHeight,
    ...p,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x.toFixed(1)},${padTop + innerHeight} L${coords[0]?.x.toFixed(1)},${padTop + innerHeight} Z`;

  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {emptyLabel}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[480px]"
            role="img"
            aria-label={`${title}: ${max} - ${
              coords.reduce((best, c) => (c.value > best.value ? c : best), coords[0])
                .label
            }`}
          >
            <line
              x1={padX}
              y1={padTop + innerHeight}
              x2={width - padX}
              y2={padTop + innerHeight}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={1}
            />
            {areaPath && (
              <path
                d={areaPath}
                className={colorClass}
                fill="currentColor"
                fillOpacity={0.1}
                stroke="none"
              />
            )}
            {linePath && (
              <path
                d={linePath}
                className={colorClass}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              />
            )}
            {coords.map((c, i) => (
              <g key={i}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={i === coords.length - 1 ? 4 : 2.5}
                  className={colorClass}
                  fill="currentColor"
                  stroke="var(--color-white, #fff)"
                  strokeWidth={2}
                >
                  <title>{`${c.label}: ${c.value}`}</title>
                </circle>
                {i % labelEvery === 0 && (
                  <text
                    x={c.x}
                    y={height - 4}
                    textAnchor="middle"
                    className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
                  >
                    {c.label}
                  </text>
                )}
              </g>
            ))}
            {coords.length > 0 && (
              <text
                x={coords[coords.length - 1].x}
                y={coords[coords.length - 1].y - 8}
                textAnchor="end"
                className="fill-zinc-700 text-[10px] font-semibold dark:fill-zinc-300"
              >
                {coords[coords.length - 1].value}
              </text>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
