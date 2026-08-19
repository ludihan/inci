"use client";

export function ReportProgress({
  elapsedMs,
  label,
}: {
  elapsedMs: number;
  label: string;
}) {
  const progress = Math.min(0.95, 1 - Math.exp(-elapsedMs / 4000));
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-150 dark:bg-zinc-50"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}
