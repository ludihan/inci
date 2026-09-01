"use client";

import { useActionState, useRef } from "react";
import { adminUpdateTicketCriticality, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import type { TicketCriticality } from "@/lib/types";
import { CRITICALITY_ORDER } from "./badges";

export function TicketCriticalitySelect({
  dict,
  lang,
  ticketId,
  criticality,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  criticality: TicketCriticality;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    adminUpdateTicketCriticality,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400 dark:text-zinc-500">
          {dict.ticket.criticality.label}:
        </span>
        <select
          name="criticality"
          defaultValue={criticality}
          onChange={() => formRef.current?.requestSubmit()}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {CRITICALITY_ORDER.map((option) => (
            <option key={option} value={option}>
              {dict.ticket.criticality[option]}
            </option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          {dict.common.generic}
        </p>
      )}
    </form>
  );
}
