"use client";

import { useActionState } from "react";
import {
  adminSetComplaintStatus,
  type ActionState,
} from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

export function ComplaintStatusForm({
  dict,
  lang,
  code,
  status,
}: {
  dict: Dict;
  lang: Locale;
  code: string;
  status: "open" | "closed";
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    adminSetComplaintStatus,
    undefined
  );

  const nextStatus: "open" | "closed" = status === "open" ? "closed" : "open";
  const isClosing = nextStatus === "closed";

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
    <form action={action} className="space-y-3">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="status" value={nextStatus} />

      {errorText && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorText}
        </p>
      )}

      <SubmitButton
        pendingLabel={dict.common.loading}
        className={
          isClosing
            ? "bg-red-700 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
            : "bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        }
      >
        {isClosing ? dict.common.close : dict.common.reopen}
      </SubmitButton>
    </form>
  );
}
