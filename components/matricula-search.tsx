"use client";

import { useRouter } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";
import { isValidRequesterCode, onlyDigits } from "@/lib/utils";
import { SubmitButton } from "./submit-button";
import { MatriculaInput } from "./matricula-input";

export function MatriculaSearch({
  dict,
  lang,
  matriculaDigits,
}: {
  dict: Dict;
  lang: Locale;
  matriculaDigits: number;
}) {
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const code = onlyDigits(
          String(new FormData(e.currentTarget).get("matricula") ?? "")
        );
        if (!isValidRequesterCode(code, matriculaDigits)) return;
        router.push(`/${lang}/track/ticket?matricula=${encodeURIComponent(code)}`);
      }}
    >
      <div className="flex-1">
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
      <div className="sm:pt-6">
        <SubmitButton>{dict.ticket.search}</SubmitButton>
      </div>
    </form>
  );
}
