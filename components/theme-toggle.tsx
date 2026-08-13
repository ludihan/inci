"use client";

import { useTheme, type Theme } from "@/components/theme-provider";

const ORDER: Theme[] = ["light", "dark", "system"];

const ICONS: Record<Theme, React.ReactNode> = {
  light: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
      <circle cx="12" cy="12" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  ),
  dark: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
      />
    </svg>
  ),
  system: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
      <rect x="3" y="4" width="18" height="12" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8M12 16v4" />
    </svg>
  ),
};

export function ThemeToggle({
  labels,
  className = "",
}: {
  labels: { light: string; dark: string; system: string };
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={`rounded-md border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 ${className}`}
      title={labels[theme]}
      aria-label={labels[theme]}
    >
      {ICONS[theme]}
    </button>
  );
}
