"use client";

import { useActionState, useRef } from "react";
import { submitComplaintReply, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function ComplaintReplyForm({
  dict,
  lang,
  code,
}: {
  dict: Dict;
  lang: Locale;
  code: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    submitComplaintReply,
    undefined
  );
  const photoInputRef = useRef<HTMLInputElement>(null);

  const errorText = (() => {
    if (!state?.error) return null;
    const key = state.error as keyof typeof dict.complaint;
    if (key in dict.complaint) return String(dict.complaint[key]);
    return dict.common.generic;
  })();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="code" value={code} />

      <div>
        <label htmlFor="content" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.complaint.fields.message} <span className="text-zinc-400">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={5}
          placeholder={dict.complaint.fields.messagePlaceholder}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      <div>
        <label htmlFor="photo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.complaint.fields.photo}
        </label>
        <input
          id="photo"
          ref={photoInputRef}
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {dict.complaint.fields.photoHelp}
        </p>
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
        {dict.complaint.replyButton}
      </SubmitButton>
    </form>
  );
}
