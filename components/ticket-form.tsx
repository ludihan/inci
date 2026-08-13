"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { createTicket, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import type { Place } from "@/lib/types";
import { isValidCpf, onlyDigits } from "@/lib/utils";
import { features } from "@/lib/features";
import { SubmitButton } from "./submit-button";
import { FileInput } from "./file-input";
import { CpfInput } from "./cpf-input";
import { usePowGate } from "./use-pow-gate";
import { PowProgress } from "./pow-progress";

export function TicketForm({
  dict,
  lang,
  places,
}: {
  dict: Dict;
  lang: Locale;
  places: Place[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createTicket,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const pow = usePowGate();

  const errorText = (() => {
    if (clientError) return clientError;
    if (pow.error) return dict.ticket[pow.error as keyof typeof dict.ticket] as string;
    if (!state?.error) return null;
    const key = state.error as keyof typeof dict.ticket;
    if (key in dict.ticket) return String(dict.ticket[key]);
    const commonKey = state.error as keyof typeof dict.common;
    return commonKey in dict.common
      ? String(dict.common[commonKey])
      : dict.common.generic;
  })();

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    pow.guardSubmit(e, () => {
      const cpf = onlyDigits(String(new FormData(e.currentTarget).get("cpf") ?? ""));
      if (!isValidCpf(cpf)) {
        setClientError(dict.ticket.cpfInvalid);
        return false;
      }
      setClientError(null);
      return true;
    });
  };

  const types = (["it", "maintenance"] as const).filter((type) =>
    type === "it"
      ? features.itTicketsEnabled
      : features.maintenanceTicketsEnabled
  );

  // pow.* accessors below are plain state/ref-object reads returned from the
  // usePowGate hook, not `.current` reads; eslint-plugin-react-hooks can't
  // tell them apart from real ref-during-render access.
  /* eslint-disable react-hooks/refs */
  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="lang" value={lang} />

      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.type}
        </label>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {types.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                pending
                  ? ""
                  : "has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:has-[:checked]:border-zinc-400 dark:has-[:checked]:bg-zinc-800"
              } border-zinc-200 hover:border-zinc-400 dark:border-zinc-700`}
            >
              <input
                type="radio"
                name="type"
                value={type}
                defaultChecked={type === types[0]}
                className="h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
              />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {type === "it"
                  ? dict.ticket.fields.it
                  : dict.ticket.fields.maintenance}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="cpf" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.cpf} <span className="text-zinc-400">*</span>
        </label>
        <CpfInput
          id="cpf"
          required
          placeholder={dict.ticket.fields.cpfPlaceholder}
          errorMessage={dict.ticket.cpfInvalid}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {dict.ticket.trackSubtitle}
        </p>
      </div>

      <div>
        <label htmlFor="subject" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.subject} <span className="text-zinc-400">*</span>
        </label>
        <input
          id="subject"
          name="subject"
          required
          placeholder={dict.ticket.fields.subjectPlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="place" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.place} <span className="text-zinc-400">*</span>
        </label>
        {places.length === 0 ? (
          <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {dict.ticket.noPlaces}
          </p>
        ) : (
          <select
            id="place"
            name="placeId"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              {dict.ticket.fields.placePlaceholder}
            </option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.message} <span className="text-zinc-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder={dict.ticket.fields.messagePlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="photo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.photo} <span className="text-zinc-400">*</span>
        </label>
        <div className="mt-1">
          <FileInput
            name="photo"
            id="photo"
            required
            requiredLabel={dict.ticket.photoRequired}
            help={dict.ticket.fields.photoHelp}
          />
        </div>
      </div>

      <input type="hidden" name="powToken" ref={pow.tokenInputRef} />
      <input type="hidden" name="powSolution" ref={pow.solutionInputRef} />

      {errorText && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorText}
        </p>
      )}

      {pow.solving ? (
        <PowProgress progress={pow.progress} label={dict.ticket.powVerifying} />
      ) : (
        <SubmitButton pendingLabel={dict.common.loading}>
          {dict.ticket.submit}
        </SubmitButton>
      )}
    </form>
  );
  /* eslint-enable react-hooks/refs */
}
