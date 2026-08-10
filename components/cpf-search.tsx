"use client";

import { useRouter } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";
import { isValidCpf, onlyDigits } from "@/lib/utils";
import { SubmitButton } from "./submit-button";
import { CpfInput } from "./cpf-input";

export function CpfSearch({ dict, lang }: { dict: Dict; lang: Locale }) {
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const cpf = onlyDigits(
          String(new FormData(e.currentTarget).get("cpf") ?? "")
        );
        if (!isValidCpf(cpf)) return;
        router.push(`/${lang}/track/ticket?cpf=${encodeURIComponent(cpf)}`);
      }}
    >
      <div className="flex-1">
        <label htmlFor="cpf" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.ticket.fields.cpf}
        </label>
        <CpfInput
          id="cpf"
          required
          placeholder={dict.ticket.fields.cpfPlaceholder}
          errorMessage={dict.ticket.cpfInvalid}
        />
      </div>
      <div className="sm:pt-6">
        <SubmitButton>{dict.ticket.search}</SubmitButton>
      </div>
    </form>
  );
}
