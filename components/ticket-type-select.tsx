"use client";

import { useActionState, useRef } from "react";
import { adminUpdateTicketType, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import type { TicketType } from "@/lib/types";

export function TicketTypeSelect({
  dict,
  lang,
  ticketId,
  type,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  type: TicketType;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    adminUpdateTicketType,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400 dark:text-zinc-500">
          {dict.ticket.typeSelect.label}
        </span>
        <select
          name="type"
          defaultValue={type}
          onChange={() => formRef.current?.requestSubmit()}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium outline-none transition focus:ring-2 focus:ring-accent/30 ${
            type === "it"
              ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          <option value="it">{dict.ticket.fields.it}</option>
          <option value="maintenance">{dict.ticket.fields.maintenance}</option>
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
