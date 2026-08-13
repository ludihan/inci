"use client";

import type { PowGateProgress } from "./use-pow-gate";

export function PowProgress({
  progress,
  label,
}: {
  progress: PowGateProgress | null;
  label: string;
}) {
  if (!progress) return null;

  const successProbabilityPerAttempt = Math.pow(16, -progress.difficulty);
  const percent = Math.min(
    99,
    100 * (1 - Math.exp(-progress.attempts * successProbabilityPerAttempt))
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <svg className="h-4 w-4 animate-spin text-zinc-900 dark:text-zinc-50" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {label}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] dark:bg-zinc-50"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {progress.attempts.toLocaleString()} · {(progress.elapsedMs / 1000).toFixed(1)}s
      </p>
    </div>
  );
}
