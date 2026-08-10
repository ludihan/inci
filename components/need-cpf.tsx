"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import { isValidCpf, onlyDigits } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

export function NeedCpf({
  dict,
  lang,
  ticketId,
  initialError,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.ticket.needCpfTitle}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {dict.ticket.needCpfHelp}
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const cpf = onlyDigits(String(new FormData(e.currentTarget).get("cpf") ?? ""));
          if (!isValidCpf(cpf)) {
            setError(dict.ticket.cpfInvalid);
            return;
          }
          setError(null);
          router.push(`/${lang}/track/ticket/${ticketId}?cpf=${encodeURIComponent(cpf)}`);
        }}
      >
        <div>
          <label htmlFor="cpf" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.fields.cpf}
          </label>
          <input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            required
            placeholder={dict.ticket.fields.cpfPlaceholder}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <SubmitButton>{dict.ticket.needCpfButton}</SubmitButton>
      </form>
    </div>
  );
}
