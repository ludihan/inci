"use client";

import Image from "next/image";
import { useActionState } from "react";
import { updateLogo, removeLogo, type ActionState } from "@/lib/actions";
import type { Settings } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { FileInput } from "./file-input";
import { SubmitButton } from "./submit-button";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "logoRequired") return dict.admin.settings.logoRequired;
  if (state.error === "invalidPhotoType") return dict.common.invalidPhotoType;
  if (state.error === "photoTooLarge") return dict.common.photoTooLarge;
  return dict.common.generic;
}

export function AdminSettingsManager({
  settings,
  dict,
  lang,
}: {
  settings: Settings;
  dict: Dict;
  lang: Locale;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateLogo,
    undefined
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.admin.settings.logoTitle}
        </h2>

        <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.admin.settings.current}
        </p>
        {settings.logoPath ? (
          <span className="relative block h-20 w-20 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-800">
            <Image
              src={settings.logoPath}
              alt={dict.appName}
              fill
              sizes="80px"
              className="object-contain"
            />
          </span>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {dict.admin.settings.none}
          </p>
        )}

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="lang" value={lang} />
          <FileInput
            name="logo"
            id="logo"
            optionalLabel={dict.common.optional}
            requiredLabel={dict.common.required}
            help={dict.admin.settings.logoHelp}
          />
          {errorText(state, dict) && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {errorText(state, dict)}
            </p>
          )}
          <SubmitButton pendingLabel={dict.common.loading}>
            {dict.admin.settings.upload}
          </SubmitButton>
        </form>

        {settings.logoPath && (
          <form action={removeLogo} className="mt-4">
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              {dict.admin.settings.remove}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
