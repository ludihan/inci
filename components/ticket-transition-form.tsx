"use client";

import { useActionState } from "react";
import {
  userTicketTransition,
  adminTicketTransition,
  type ActionState,
} from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";
import { MultiFileInput } from "./multi-file-input";
import { usePowGate } from "./use-pow-gate";
import { PowProgress } from "./pow-progress";

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
  const pow = usePowGate();

  const isClosing = transition === "close";
  const errorText = (() => {
    if (!admin && pow.error)
      return dict.ticket[pow.error as keyof typeof dict.ticket] as string;
    if (!state?.error) return null;
    const key = state.error as keyof typeof dict.ticket;
    if (key in dict.ticket) return String(dict.ticket[key]);
    const commonKey = state.error as keyof typeof dict.common;
    return commonKey in dict.common
      ? String(dict.common[commonKey])
      : dict.common.generic;
  })();

  // pow.* accessors below are plain state/ref-object reads returned from the
  // usePowGate hook, not `.current` reads; eslint-plugin-react-hooks can't
  // tell them apart from real ref-during-render access.
  /* eslint-disable react-hooks/refs */
  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={admin ? undefined : (e) => pow.guardSubmit(e)}
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="transition" value={transition} />
      {cpf && <input type="hidden" name="cpf" value={cpf} />}
      {!admin && (
        <>
          <input type="hidden" name="powToken" ref={pow.tokenInputRef} />
          <input type="hidden" name="powSolution" ref={pow.solutionInputRef} />
        </>
      )}

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
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.photo}{" "}
          <span className="text-zinc-400">{dict.common.optional}</span>
        </label>
        <div className="mt-1">
          <MultiFileInput dict={dict} />
        </div>
      </div>

      {errorText && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorText}
        </p>
      )}

      {!admin && pow.solving ? (
        <PowProgress progress={pow.progress} label={dict.ticket.powVerifying} />
      ) : (
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
      )}
    </form>
  );
  /* eslint-enable react-hooks/refs */
}
