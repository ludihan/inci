"use client";

import { useActionState } from "react";
import { createPlace, deletePlace, type ActionState } from "@/lib/actions";
import type { Place } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "nameRequired") return dict.admin.places.nameRequired;
  if (state.error === "duplicate-place") return dict.admin.places.duplicate;
  return dict.common.generic;
}

function PlaceForm({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createPlace,
    undefined
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.admin.places.newTitle}
      </h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label
            htmlFor="new-place-name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.admin.places.name}
          </label>
          <input
            id="new-place-name"
            name="name"
            required
            placeholder={dict.admin.places.namePlaceholder}
            className={inputClass}
          />
        </div>
        {errorText(state, dict) && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {errorText(state, dict)}
          </p>
        )}
        <SubmitButton pendingLabel={dict.common.loading}>
          {dict.admin.places.create}
        </SubmitButton>
      </form>
    </div>
  );
}

export function AdminPlacesManager({
  places,
  dict,
  lang,
}: {
  places: Place[];
  dict: Dict;
  lang: Locale;
}) {
  return (
    <div className="space-y-6">
      <PlaceForm dict={dict} lang={lang} />

      {places.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.admin.places.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {places.map((place) => (
            <li
              key={place.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {place.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {dict.common.createdAt}: {place.createdAt.slice(0, 10)}
                </p>
              </div>
              <form action={deletePlace}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="id" value={place.id} />
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {dict.admin.places.delete}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
