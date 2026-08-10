"use client";

import { useActionState } from "react";
import {
  adminAddComplaintResponse,
  type ActionState,
} from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function AdminComplaintReplyForm({
  dict,
  lang,
  code,
}: {
  dict: Dict;
  lang: Locale;
  code: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    adminAddComplaintResponse,
    undefined
  );

  const errorText = (() => {
    if (!state?.error) return null;
    const key = state.error as keyof typeof dict.complaint;
    if (key in dict.complaint) return String(dict.complaint[key]);
    const commonKey = state.error as keyof typeof dict.common;
    return commonKey in dict.common
      ? String(dict.common[commonKey])
      : dict.common.generic;
  })();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="code" value={code} />

      <div>
        <label
          htmlFor={`complaint-reply-${code}`}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {dict.complaint.responses} <span className="text-zinc-400">*</span>
        </label>
        <textarea
          id={`complaint-reply-${code}`}
          name="content"
          required
          rows={3}
          placeholder={dict.complaint.fields.messagePlaceholder}
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

      <SubmitButton pendingLabel={dict.common.sending}>
        {dict.common.send}
      </SubmitButton>
    </form>
  );
}
