"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function TicketCodeJump({
  dict,
  locale,
}: {
  dict: Dict;
  locale: Locale;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex w-full min-w-0 items-start gap-2 sm:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const code = String(data.get("code") ?? "")
          .trim()
          .toUpperCase();
        if (!code) {
          setError(dict.admin.table.jumpError);
          return;
        }
        setError(null);
        router.push(`/${locale}/admin/tickets/${encodeURIComponent(code)}`);
      }}
    >
      <div className="min-w-0 flex-1 sm:flex-none">
        <input
          name="code"
          placeholder={dict.admin.table.jumpPlaceholder}
          className="block w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 sm:w-56 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
        {error && (
          <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <SubmitButton>{dict.admin.table.jumpButton}</SubmitButton>
    </form>
  );
}
