"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";

// Custom from/to date-range filter for the dashboard (ported from
// inci-masf-fsa). When a range is set it takes precedence over the preset
// period buttons; clearing it falls back to the preset period.
export function PeriodRangeFilter({
  dict,
  locale,
  from,
  to,
}: {
  dict: Dict;
  locale: Locale;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const apply = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    const query = params.toString();
    router.push(`/${locale}/admin${query ? `?${query}` : ""}`);
  };

  const dirty = localFrom !== from || localTo !== to;
  const d = dict.admin.dashboard;

  const inputClass =
    "rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(localFrom, localTo);
      }}
    >
      <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {d.rangeFrom}
        <input
          type="date"
          value={localFrom}
          max={localTo || undefined}
          onChange={(e) => setLocalFrom(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {d.rangeTo}
        <input
          type="date"
          value={localTo}
          min={localFrom || undefined}
          onChange={(e) => setLocalTo(e.target.value)}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={!dirty}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {d.rangeApply}
      </button>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            setLocalFrom("");
            setLocalTo("");
            apply("", "");
          }}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {d.rangeClear}
        </button>
      )}
    </form>
  );
}
