"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import { isValidCpf, onlyDigits } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

export function CpfSearch({ dict, lang }: { dict: Dict; lang: Locale }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const cpf = onlyDigits(String(inputRef.current?.value ?? ""));
        if (!isValidCpf(cpf)) {
          setError(dict.ticket.cpfInvalid);
          return;
        }
        setError(null);
        router.push(`/${lang}/track/ticket?cpf=${encodeURIComponent(cpf)}`);
      }}
    >
      <div className="flex-1">
        <label htmlFor="cpf" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.cpf}
        </label>
        <input
          id="cpf"
          ref={inputRef}
          name="cpf"
          required
          inputMode="numeric"
          placeholder={dict.ticket.fields.cpfPlaceholder}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
        {error && (
          <p
            role="alert"
            className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>
      <div className="sm:pt-6">
        <SubmitButton>{dict.ticket.search}</SubmitButton>
      </div>
    </form>
  );
}
