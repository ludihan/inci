"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function LoginForm({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<ActionState, FormData>(
    login,
    undefined
  );

  const errorText = (() => {
    if (!state?.error) return null;
    const key = state.error as keyof typeof dict.admin;
    if (key in dict.admin) return String(dict.admin[key]);
    return dict.common.generic;
  })();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />

      <div>
        <label
          htmlFor="username"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {dict.admin.username}
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {dict.admin.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
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

      <SubmitButton pendingLabel={dict.common.loading}>
        {dict.admin.loginButton}
      </SubmitButton>
    </form>
  );
}
