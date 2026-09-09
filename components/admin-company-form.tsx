"use client";

import Image from "next/image";
import { useActionState } from "react";
import { updateCompany, type ActionState } from "@/lib/actions";
import type { Company } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { CnpjInput } from "./cnpj-input";
import { PhoneInput } from "./phone-input";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";
const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "cnpjInvalid") return dict.common.cnpjInvalid;
  if (state.error === "phoneInvalid") return dict.ticket.phoneInvalid;
  if (state.error === "invalidPhotoType") return dict.common.invalidPhotoType;
  if (state.error === "photoTooLarge") return dict.common.photoTooLarge;
  return dict.common.generic;
}

export function AdminCompanyForm({
  company,
  dict,
  lang,
  saved,
}: {
  company: Company;
  dict: Dict;
  lang: Locale;
  saved: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateCompany,
    undefined
  );
  const c = dict.admin.company;

  return (
    <form
      action={action}
      className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="lang" value={lang} />

      {saved && !state?.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {c.saved}
        </p>
      )}

      <div>
        <label htmlFor="company-name" className={labelClass}>
          {c.name}
        </label>
        <input
          id="company-name"
          name="name"
          defaultValue={company.name}
          placeholder={c.namePlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="company-cnpj" className={labelClass}>
          {c.cnpj}
        </label>
        <CnpjInput
          id="company-cnpj"
          name="cnpj"
          defaultValue={company.cnpj}
          errorMessage={dict.common.cnpjInvalid}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <label htmlFor="company-street" className={labelClass}>
            {c.addressStreet}
          </label>
          <input
            id="company-street"
            name="addressStreet"
            defaultValue={company.addressStreet}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="company-number" className={labelClass}>
            {c.addressNumber}
          </label>
          <input
            id="company-number"
            name="addressNumber"
            defaultValue={company.addressNumber}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="company-neighborhood" className={labelClass}>
          {c.addressNeighborhood}
        </label>
        <input
          id="company-neighborhood"
          name="addressNeighborhood"
          defaultValue={company.addressNeighborhood}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="company-phone" className={labelClass}>
          {c.phone}
        </label>
        <PhoneInput
          id="company-phone"
          name="phone"
          defaultValue={company.phone}
          errorMessage={dict.ticket.phoneInvalid}
        />
      </div>

      <div>
        <label htmlFor="company-form-code" className={labelClass}>
          {c.formCode}
        </label>
        <input
          id="company-form-code"
          name="formCode"
          defaultValue={company.formCode}
          placeholder={c.formCodePlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <p className={`${labelClass} mb-2`}>{c.logoTitle}</p>
        {company.logoPath ? (
          <span className="relative mb-3 block h-20 w-20 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-800">
            <Image
              src={company.logoPath}
              alt={c.currentLogo}
              fill
              sizes="80px"
              className="object-contain"
            />
          </span>
        ) : (
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            {c.noLogo}
          </p>
        )}
        <input
          type="file"
          name="logo"
          id="company-logo"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:hover:file:bg-zinc-700"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {c.logoHelp}
        </p>
        {company.logoPath && (
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <input type="checkbox" name="removeLogo" />
            {c.removeLogo}
          </label>
        )}
      </div>

      {errorText(state, dict) && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {errorText(state, dict)}
        </p>
      )}

      <SubmitButton pendingLabel={dict.common.loading}>{c.save}</SubmitButton>
    </form>
  );
}
