"use client";

import { useActionState, useState } from "react";
import {
  createArea,
  deleteArea,
  renameArea,
  type ActionState,
} from "@/lib/actions";
import type { Area } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "nameRequired") return dict.admin.areas.nameRequired;
  if (state.error === "duplicate-area") return dict.admin.areas.duplicate;
  if (state.error === "notFound") return dict.common.notFound;
  return dict.common.generic;
}

function AreaForm({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createArea,
    undefined
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.admin.areas.newTitle}
      </h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label
            htmlFor="new-area-name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.admin.areas.name}
          </label>
          <input
            id="new-area-name"
            name="name"
            required
            placeholder={dict.admin.areas.namePlaceholder}
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
          {dict.admin.areas.create}
        </SubmitButton>
      </form>
    </div>
  );
}

function RenameForm({
  area,
  dict,
  lang,
}: {
  area: Area;
  dict: Dict;
  lang: Locale;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    renameArea,
    undefined
  );

  return (
    <form action={action} className="flex items-start gap-3">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="id" value={area.id} />
      <div className="min-w-0 flex-1">
        <input
          name="name"
          required
          defaultValue={area.name}
          aria-label={dict.admin.areas.name}
          className={`${inputClass} mt-0`}
        />
        {errorText(state, dict) && (
          <p
            role="alert"
            className="mt-1 text-xs font-medium text-red-600 dark:text-red-400"
          >
            {errorText(state, dict)}
          </p>
        )}
      </div>
      <SubmitButton
        pendingLabel={dict.common.loading}
        className="shrink-0 px-3 py-2"
      >
        {dict.common.save}
      </SubmitButton>
    </form>
  );
}

function AreaRow({
  area,
  dict,
  lang,
}: {
  area: Area;
  dict: Dict;
  lang: Locale;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {editing ? (
        <div className="min-w-0 flex-1">
          <RenameForm area={area} dict={dict} lang={lang} />
        </div>
      ) : (
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {area.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {dict.common.createdAt}: {area.createdAt.slice(0, 10)}
          </p>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {editing ? dict.common.cancel : dict.admin.areas.rename}
        </button>
        {!editing && (
          <form action={deleteArea}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={area.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              {dict.admin.areas.delete}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export function AdminAreasManager({
  areas,
  dict,
  lang,
}: {
  areas: Area[];
  dict: Dict;
  lang: Locale;
}) {
  return (
    <div className="space-y-6">
      <AreaForm dict={dict} lang={lang} />

      {areas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.admin.areas.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {areas.map((area) => (
            <AreaRow key={area.id} area={area} dict={dict} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  );
}
