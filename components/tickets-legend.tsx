"use client";

import { useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import { CRITICALITY_ORDER, CriticalityBadge } from "./badges";
import { SlaPill } from "./sla-badge";
import { SLA_HOURS, formatSlaHours } from "@/lib/sla";

/**
 * A "?" button in the top bar that opens a guide to the tickets list:
 * row colors, SLA deadline pills, and criticality response times.
 */
export function TicketsLegend({
  dict,
  locale,
}: {
  dict: Dict;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pt = locale === "pt";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={pt ? "O que cada cor e selo significa" : "What each color and badge means"}
        className={`grid h-9 w-9 place-items-center rounded-lg border text-sm font-bold transition-colors ${
          open
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        }`}
      >
        <span aria-hidden>?</span>
        <span className="sr-only">
          {pt ? "Legenda da lista de chamados" : "Tickets list legend"}
        </span>
      </button>

      <div
        role="dialog"
        aria-label={pt ? "Legenda da lista de chamados" : "Tickets list legend"}
        className={`fixed inset-x-4 top-32 z-50 max-h-[calc(100dvh-9rem)] origin-top overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-xl transition duration-200 ease-panel lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:max-h-none lg:w-[22rem] lg:origin-top-right lg:overflow-visible dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        inert={!open}
      >
        <Section title={pt ? "Cor da linha — situação" : "Row color — status"}>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-2 shrink-0 rounded-full bg-red-500" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {dict.common.open}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {pt ? "ninguém começou ainda" : "not started yet"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-2 shrink-0 rounded-full bg-amber-500" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {dict.common.inProgress}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {pt ? "um técnico assumiu" : "claimed by a technician"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-2 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {dict.common.closed}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {pt ? "resolvido e encerrado" : "resolved and closed"}
              </span>
            </li>
          </ul>
        </Section>

        <Section title={pt ? "Prazo — tempo de resposta" : "Deadline — response SLA"}>
          <ul className="space-y-1.5">
            <Row sample={<SlaPill state="on_time">{pt ? "Restam 3d 4h" : "3d 4h left"}</SlaPill>}>
              {pt ? "dentro do prazo" : "within SLA"}
            </Row>
            <Row sample={<SlaPill state="due_soon">{pt ? "Restam 9h" : "9h left"}</SlaPill>}>
              {pt ? "último quarto do prazo" : "final quarter of SLA"}
            </Row>
            <Row sample={<SlaPill state="late">{pt ? "Atrasado 1d 2h" : "Overdue 1d 2h"}</SlaPill>}>
              {pt ? "passou do prazo" : "past deadline"}
            </Row>
            <Row sample={<SlaPill state="done_on_time">{pt ? "Concluído no prazo" : "Closed on time"}</SlaPill>}>
              {pt ? "fechado a tempo" : "closed before deadline"}
            </Row>
            <Row sample={<SlaPill state="done_late">{pt ? "Atrasou 6h" : "Late by 6h"}</SlaPill>}>
              {pt ? "fechado com atraso" : "closed past deadline"}
            </Row>
          </ul>
        </Section>

        <Section title={pt ? "Criticidade — prazo" : "Criticality — SLA"} last>
          <ul className="space-y-1.5">
            {CRITICALITY_ORDER.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <CriticalityBadge criticality={c} dict={dict} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatSlaHours(SLA_HOURS[c], locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            {pt
              ? "Clique numa linha para abrir o chamado e no título de uma coluna para ordenar."
              : "Click a row to open the ticket and a column header to sort."}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        last ? "" : "mb-3 border-b border-zinc-100 pb-3 dark:border-zinc-800"
      }
    >
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  sample,
  children,
}: {
  sample: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="shrink-0">{sample}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{children}</span>
    </li>
  );
}
