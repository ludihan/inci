"use client";

import { useActionState, useEffect, useState } from "react";
import { login, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

function formatWait(seconds: number, dict: Dict): string {
  if (seconds < 60) {
    return seconds === 1
      ? dict.admin.waitSecond
      : dict.admin.waitSeconds.replace("{n}", String(seconds));
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function LoginForm({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<ActionState, FormData>(
    login,
    undefined
  );

  // Seconds left in a lockout, counting down from what the server said.
  const [lockedFor, setLockedFor] = useState(0);
  useEffect(() => {
    const retryAfter = state?.retryAfter ?? 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLockedFor(retryAfter);
    if (retryAfter <= 0) return;
    const until = Date.now() + retryAfter * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLockedFor(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  const errorText = (() => {
    if (!state?.error) return null;
    if (state.error === "tooManyAttempts" && state.retryAfter) {
      return lockedFor > 0
        ? dict.admin.tooManyAttempts.replace("{wait}", formatWait(lockedFor, dict))
        : null;
    }
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
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent"
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
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent"
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

      <SubmitButton pendingLabel={dict.common.loading} disabled={lockedFor > 0}>
        {dict.admin.loginButton}
      </SubmitButton>
    </form>
  );
}
