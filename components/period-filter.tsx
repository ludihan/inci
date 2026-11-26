"use client";

import { useEffect, useRef, useState } from "react";

const inputClass =
  "w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function isApplicable(value: string): boolean {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return Number(value.slice(0, 4)) >= 2000;
}

/**
 * Two date fields that report a new period as soon as a date is picked — no
 * "apply" button. Changes are debounced a little so keyboard entry doesn't
 * fire a navigation per keystroke.
 */
export function DateRangeInputs({
  from,
  to,
  fromLabel,
  toLabel,
  onChange,
}: {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  onChange: (from: string, to: string) => void;
}) {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const [seen, setSeen] = useState(`${from}|${to}`);
  if (seen !== `${from}|${to}`) {
    setSeen(`${from}|${to}`);
    setLocalFrom(from);
    setLocalTo(to);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const schedule = (nextFrom: string, nextTo: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!isApplicable(nextFrom) || !isApplicable(nextTo)) return;
    if (nextFrom === from && nextTo === to) return;
    timer.current = setTimeout(() => onChangeRef.current(nextFrom, nextTo), 350);
  };

  return (
    <div className="grid grid-cols-1 gap-2">
      <label className="flex min-w-0 flex-col gap-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {fromLabel}
        <input
          type="date"
          value={localFrom}
          max={localTo || undefined}
          onChange={(e) => {
            setLocalFrom(e.target.value);
            schedule(e.target.value, localTo);
          }}
          className={inputClass}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {toLabel}
        <input
          type="date"
          value={localTo}
          min={localFrom || undefined}
          onChange={(e) => {
            setLocalTo(e.target.value);
            schedule(localFrom, e.target.value);
          }}
          className={inputClass}
        />
      </label>
    </div>
  );
}
