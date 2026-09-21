"use client";

import { useActionState, useState } from "react";
import {
  createServiceType,
  updateServiceType,
  deleteServiceType,
  type ActionState,
} from "@/lib/actions";
import type { ServiceType } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "nameRequired") return dict.admin.serviceTypes.nameRequired;
  if (state.error === "duplicate-service-type")
    return dict.admin.serviceTypes.duplicate;
  if (state.error === "service-type-in-use")
    return dict.admin.serviceTypes.inUse;
  if (state.error === "notFound") return dict.common.notFound;
  return dict.common.generic;
}

function ServiceTypeForm({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createServiceType,
    undefined
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.admin.serviceTypes.newTitle}
      </h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-service-name"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.serviceTypes.name}
            </label>
            <input
              id="new-service-name"
              name="name"
              required
              placeholder={dict.admin.serviceTypes.namePlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="new-service-price"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.serviceTypes.price}
            </label>
            <input
              id="new-service-price"
              name="defaultPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
            />
          </div>
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
          {dict.admin.serviceTypes.create}
        </SubmitButton>
      </form>
    </div>
  );
}

function EditForm({
  serviceType,
  dict,
  lang,
}: {
  serviceType: ServiceType;
  dict: Dict;
  lang: Locale;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateServiceType,
    undefined
  );

  return (
    <form action={action} className="flex flex-wrap items-start gap-3">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="id" value={serviceType.id} />
      <div className="min-w-0 flex-1">
        <input
          name="name"
          required
          defaultValue={serviceType.name}
          aria-label={dict.admin.serviceTypes.name}
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
      <input
        name="defaultPrice"
        type="number"
        step="0.01"
        min="0"
        defaultValue={serviceType.defaultPrice}
        aria-label={dict.admin.serviceTypes.price}
        className={`${inputClass} mt-0 w-28`}
      />
      <SubmitButton
        pendingLabel={dict.common.loading}
        className="shrink-0 px-3 py-2"
      >
        {dict.common.save}
      </SubmitButton>
    </form>
  );
}

function ServiceTypeRow({
  serviceType,
  dict,
  lang,
}: {
  serviceType: ServiceType;
  dict: Dict;
  lang: Locale;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      {editing ? (
        <div className="min-w-0 flex-1">
          <EditForm serviceType={serviceType} dict={dict} lang={lang} />
        </div>
      ) : (
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {serviceType.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatCurrency(serviceType.defaultPrice)} · {dict.common.createdAt}:{" "}
            {serviceType.createdAt.slice(0, 10)}
          </p>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {editing ? dict.common.cancel : dict.admin.serviceTypes.rename}
        </button>
        {!editing && (
          <form action={deleteServiceType}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={serviceType.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              {dict.admin.serviceTypes.delete}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export function AdminServiceTypesManager({
  serviceTypes,
  dict,
  lang,
}: {
  serviceTypes: ServiceType[];
  dict: Dict;
  lang: Locale;
}) {
  return (
    <div className="space-y-6">
      <ServiceTypeForm dict={dict} lang={lang} />

      {serviceTypes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.admin.serviceTypes.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {serviceTypes.map((serviceType) => (
            <ServiceTypeRow
              key={serviceType.id}
              serviceType={serviceType}
              dict={dict}
              lang={lang}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
