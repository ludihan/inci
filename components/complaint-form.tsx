"use client";

import { useActionState } from "react";
import { createComplaint, type ActionState } from "@/lib/actions";
import type { Dict, Locale } from "@/lib/i18n";
import type { Place } from "@/lib/types";
import { SubmitButton } from "./submit-button";
import { FileInput } from "./file-input";

export function ComplaintForm({
  dict,
  lang,
  places,
}: {
  dict: Dict;
  lang: Locale;
  places: Place[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createComplaint,
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

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="lang" value={lang} />

      <div>
        <label htmlFor="subject" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.complaint.fields.subject} <span className="text-zinc-400">*</span>
        </label>
        <input
          id="subject"
          name="subject"
          required
          placeholder={dict.complaint.fields.subjectPlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="place" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.complaint.fields.place} <span className="text-zinc-400">*</span>
        </label>
        {places.length === 0 ? (
          <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {dict.complaint.noPlaces}
          </p>
        ) : (
          <select
            id="place"
            name="placeId"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              {dict.complaint.fields.placePlaceholder}
            </option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="content" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.complaint.fields.message} <span className="text-zinc-400">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={6}
          placeholder={dict.complaint.fields.messagePlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="photo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {dict.complaint.fields.photo}
        </label>
        <div className="mt-1">
          <FileInput
            name="photo"
            id="photo"
            optionalLabel={dict.common.optional}
            requiredLabel={dict.common.required}
            help={dict.complaint.fields.photoHelp}
          />
        </div>
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
        {dict.complaint.submit}
      </SubmitButton>
    </form>
  );
}
