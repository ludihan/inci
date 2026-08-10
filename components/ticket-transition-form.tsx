"use client";

import { useActionState } from "react";
import {
  userTicketTransition,
  adminTicketTransition,
  type ActionState,
} from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function TicketTransitionForm({
  dict,
  lang,
  ticketId,
  transition,
  cpf,
  admin = false,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  transition: "open" | "close";
  cpf?: string;
  admin?: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    admin ? adminTicketTransition : userTicketTransition,
    undefined
  );

  const isClosing = transition === "close";
  const errorText = (() => {
    if (!state?.error) return null;
    const key = state.error as keyof typeof dict.ticket;
    if (key in dict.ticket) return String(dict.ticket[key]);
    const commonKey = state.error as keyof typeof dict.common;
    return commonKey in dict.common
      ? String(dict.common[commonKey])
      : dict.common.generic;
  })();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="transition" value={transition} />
      {cpf && <input type="hidden" name="cpf" value={cpf} />}

      <div>
        <label
          htmlFor={`transition-${ticketId}`}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {dict.ticket.transitionPrompt}{" "}
          <span className="text-zinc-400">*</span>
        </label>
        <textarea
          id={`transition-${ticketId}`}
          name="content"
          required
          rows={2}
          placeholder={
            isClosing
              ? dict.ticket.fields.closePlaceholder
              : dict.ticket.fields.reopenPlaceholder
          }
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      <div>
        <label
          htmlFor={`photo-${ticketId}`}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {dict.ticket.fields.photo}
        </label>
        <input
          id={`photo-${ticketId}`}
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
        />
      </div>

      {errorText && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorText}
        </p>
      )}

      <SubmitButton
        pendingLabel={dict.common.loading}
        className={
          isClosing
            ? "bg-red-700 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
            : "bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        }
      >
        {isClosing ? dict.ticket.closeTicket : dict.ticket.reopenTicket}
      </SubmitButton>
    </form>
  );
}
