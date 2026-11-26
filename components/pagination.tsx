"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MAX_PER_PAGE,
  PER_PAGE_COOKIE,
  PER_PAGE_OPTIONS,
} from "@/lib/admin-panels";
import type { Locale } from "@/lib/i18n";
import { setPreferenceCookie } from "@/components/use-panels";

function pageList(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

const btnBase =
  "h-9 min-w-9 place-items-center rounded-lg px-2.5 text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const btn = `grid ${btnBase}`;

export function Pagination({
  page,
  perPage,
  total,
  locale,
}: {
  page: number;
  perPage: number;
  total: number;
  locale: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const isPreset = (PER_PAGE_OPTIONS as readonly number[]).includes(perPage);
  const [custom, setCustom] = useState(!isPreset);
  const [customValue, setCustomValue] = useState(String(perPage));
  const pt = locale === "pt";

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(total, page * perPage);

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    startTransition(() =>
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    );
    document
      .getElementById("tickets-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applied = useRef(perPage);
  const setPerPage = (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > MAX_PER_PAGE || n === applied.current) {
      return;
    }
    applied.current = n;
    setPreferenceCookie(PER_PAGE_COOKIE, String(n));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      router.refresh();
    });
  };

  return (
    <nav
      aria-label={pt ? "Paginação" : "Pagination"}
      className={`sticky bottom-0 z-10 -mx-4 -mb-6 mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur transition-opacity sm:-mx-6 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/95 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="tabular-nums">
          {total === 0 ? (
            pt ? "Nenhum chamado" : "No tickets"
          ) : (
            <>
              <strong className="text-zinc-900 dark:text-zinc-50">
                {first}–{last}
              </strong>{" "}
              {pt ? "de" : "of"}{" "}
              <strong className="text-zinc-900 dark:text-zinc-50">{total}</strong>
            </>
          )}
        </span>
        <label className="flex items-center gap-2">
          <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">
            {pt ? "Por página" : "Per page"}
          </span>
          <select
            value={custom ? "custom" : String(perPage)}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setCustom(true);
                return;
              }
              setCustom(false);
              setPerPage(Number(e.target.value));
            }}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="custom">{pt ? "Outro…" : "Custom…"}</option>
          </select>
        </label>
        {custom && (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              setPerPage(Number(customValue));
            }}
          >
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PER_PAGE}
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onBlur={() => setPerPage(Number(customValue))}
              aria-label={
                pt
                  ? `Chamados por página (1 a ${MAX_PER_PAGE})`
                  : `Tickets per page (1 to ${MAX_PER_PAGE})`
              }
              className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums text-zinc-900 shadow-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              OK
            </button>
          </form>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label={pt ? "Página anterior" : "Previous page"}
            className={`${btn} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="px-2 text-sm font-semibold tabular-nums text-zinc-700 sm:hidden dark:text-zinc-300">
            {page} / {totalPages}
          </span>
          {pageList(page, totalPages).map((p, i) =>
            p === "gap" ? (
              <span
                key={`gap-${i}`}
                className="hidden px-1 text-zinc-400 sm:inline"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${btnBase} hidden sm:grid ${
                  p === page
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            aria-label={pt ? "Próxima página" : "Next page"}
            className={`${btn} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </nav>
  );
}
