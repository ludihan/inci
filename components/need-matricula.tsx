"use client";

import { useRouter } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";
import { isValidRequesterCode, onlyDigits } from "@/lib/utils";
import { SubmitButton } from "./submit-button";
import { MatriculaInput } from "./matricula-input";

export function NeedMatricula({
  dict,
  lang,
  ticketId,
  matriculaDigits,
  initialError,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  matriculaDigits: number;
  initialError?: string;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.ticket.needMatriculaTitle}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {dict.ticket.needMatriculaHelp}
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const code = onlyDigits(
            String(new FormData(e.currentTarget).get("matricula") ?? "")
          );
          if (!isValidRequesterCode(code, matriculaDigits)) return;
          router.push(
            `/${lang}/track/ticket/${ticketId}?matricula=${encodeURIComponent(code)}`
          );
        }}
      >
        <div>
          <label
            htmlFor="matricula"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.ticket.fields.matricula}
          </label>
          <MatriculaInput
            id="matricula"
            required
            placeholder={dict.ticket.fields.matriculaPlaceholder}
            errorMessage={dict.ticket.matriculaInvalid}
            maxDigits={11}
            validate={(v) => isValidRequesterCode(v, matriculaDigits)}
          />
        </div>

        {initialError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {initialError}
          </p>
        )}

        <SubmitButton>{dict.ticket.needMatriculaButton}</SubmitButton>
      </form>
    </div>
  );
}
