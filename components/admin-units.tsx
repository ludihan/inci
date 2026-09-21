"use client";

import { useActionState, useState } from "react";
import {
  createUnit,
  deleteUnit,
  renameUnit,
  type ActionState,
} from "@/lib/actions";
import type { Company, Unit } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatCnpj } from "@/lib/utils";
import { CnpjInput } from "./cnpj-input";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent";

function CompanySelect({
  companies,
  dict,
  defaultValue,
  id,
}: {
  companies: Company[];
  dict: Dict;
  defaultValue?: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      name="companyId"
      defaultValue={defaultValue ?? ""}
      aria-label={dict.admin.units.company}
      className={inputClass}
    >
      <option value="">{dict.admin.units.noCompany}</option>
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name || dict.admin.units.unnamedCompany}
        </option>
      ))}
    </select>
  );
}

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "nameRequired") return dict.admin.units.nameRequired;
  if (state.error === "duplicate-unit") return dict.admin.units.duplicate;
  if (state.error === "companyInvalid") return dict.admin.units.companyInvalid;
  if (state.error === "cnpjInvalid") return dict.common.cnpjInvalid;
  if (state.error === "notFound") return dict.common.notFound;
  return dict.common.generic;
}

function UnitForm({
  companies,
  dict,
  lang,
}: {
  companies: Company[];
  dict: Dict;
  lang: Locale;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createUnit,
    undefined
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.admin.units.newTitle}
      </h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label
            htmlFor="new-unit-name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.admin.units.name}
          </label>
          <input
            id="new-unit-name"
            name="name"
            required
            placeholder={dict.admin.units.namePlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="new-unit-cnpj"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.admin.units.cnpj}
          </label>
          <CnpjInput
            id="new-unit-cnpj"
            errorMessage={dict.common.cnpjInvalid}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {dict.admin.units.cnpjHelp}
          </p>
        </div>
        <div>
          <label
            htmlFor="new-unit-company"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.admin.units.company}
          </label>
          <CompanySelect id="new-unit-company" companies={companies} dict={dict} />
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
          {dict.admin.units.create}
        </SubmitButton>
      </form>
    </div>
  );
}

function RenameForm({
  unit,
  companies,
  dict,
  lang,
}: {
  unit: Unit;
  companies: Company[];
  dict: Dict;
  lang: Locale;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    renameUnit,
    undefined
  );

  return (
    <form action={action} className="flex items-start gap-3">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="id" value={unit.id} />
      <div className="min-w-0 flex-1">
        <input
          name="name"
          required
          defaultValue={unit.name}
          aria-label={dict.admin.units.name}
          className={`${inputClass} mt-0`}
        />
        <div className="mt-2">
          <CnpjInput
            defaultValue={unit.cnpj ?? ""}
            ariaLabel={dict.admin.units.cnpj}
            errorMessage={dict.common.cnpjInvalid}
          />
        </div>
        <div className="mt-2">
          <CompanySelect
            companies={companies}
            dict={dict}
            defaultValue={unit.companyId}
          />
        </div>
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

function UnitRow({
  unit,
  companies,
  dict,
  lang,
}: {
  unit: Unit;
  companies: Company[];
  dict: Dict;
  lang: Locale;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li
      className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {editing ? (
        <div className="min-w-0 flex-1">
          <RenameForm unit={unit} companies={companies} dict={dict} lang={lang} />
        </div>
      ) : (
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {unit.name}
          </p>
          {unit.cnpj && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {dict.admin.units.cnpj}: {formatCnpj(unit.cnpj)}
            </p>
          )}
          {unit.company && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {dict.admin.units.company}: {unit.company.name || dict.admin.units.unnamedCompany}
            </p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {dict.common.createdAt}: {unit.createdAt.slice(0, 10)}
          </p>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {editing ? dict.common.cancel : dict.admin.units.rename}
        </button>
        {!editing && (
          <form action={deleteUnit}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={unit.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              {dict.admin.units.delete}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export function AdminUnitsManager({
  units,
  companies,
  dict,
  lang,
}: {
  units: Unit[];
  companies: Company[];
  dict: Dict;
  lang: Locale;
}) {
  return (
    <div className="space-y-6">
      <UnitForm companies={companies} dict={dict} lang={lang} />

      {units.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.admin.units.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {units.map((unit) => (
            <UnitRow key={unit.id} unit={unit} companies={companies} dict={dict} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  );
}
