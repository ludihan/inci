"use client";

import { useActionState, useState } from "react";
import {
  addTicketServiceAction,
  removeTicketServiceAction,
  updateTicketServiceAction,
  type ActionState,
} from "@/lib/actions";
import type { ServiceType, TicketServiceUsage } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "serviceRequired")
    return dict.ticket.services.serviceRequired;
  if (state.error === "quantityInvalid")
    return dict.ticket.services.quantityInvalid;
  if (state.error === "notFound") return dict.common.notFound;
  return dict.common.generic;
}

function UsageRow({
  dict,
  lang,
  ticketId,
  usage,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  usage: TicketServiceUsage;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateTicketServiceAction,
    undefined
  );
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      {editing ? (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="ticketId" value={ticketId} />
          <input
            type="hidden"
            name="serviceTypeId"
            value={usage.serviceType.id}
          />
          <div className="w-24">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.services.quantityShort}
            </label>
            <input
              name="quantity"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={usage.quantity}
              className={`${inputClass} mt-0.5`}
            />
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.services.unitPrice}
            </label>
            <input
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={usage.unitPrice}
              className={`${inputClass} mt-0.5`}
            />
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.services.discount}
            </label>
            <input
              name="discount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={usage.discount}
              className={`${inputClass} mt-0.5`}
            />
          </div>
          <SubmitButton pendingLabel={dict.common.loading}>
            {dict.common.save}
          </SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {dict.common.cancel}
          </button>
          {errorText(state, dict) && (
            <p
              role="alert"
              className="w-full text-xs font-medium text-red-600 dark:text-red-400"
            >
              {errorText(state, dict)}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {usage.serviceType.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {usage.quantity} × {formatCurrency(usage.unitPrice)}
              {usage.discount > 0 && ` − ${formatCurrency(usage.discount)}`} ={" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                {formatCurrency(usage.total)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {dict.ticket.services.edit}
            </button>
            <form action={removeTicketServiceAction}>
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="ticketId" value={ticketId} />
              <input
                type="hidden"
                name="serviceTypeId"
                value={usage.serviceType.id}
              />
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                {dict.ticket.services.remove}
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}

function AddServiceForm({
  dict,
  lang,
  ticketId,
  catalog,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  catalog: ServiceType[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addTicketServiceAction,
    undefined
  );
  const [serviceTypeId, setServiceTypeId] = useState("");

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.services.fromCatalog}
          </label>
          <select
            name="serviceTypeId"
            value={serviceTypeId}
            onChange={(e) => setServiceTypeId(e.target.value)}
            className={inputClass}
          >
            <option value="">{dict.ticket.services.newItem}</option>
            {catalog.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        {!serviceTypeId && (
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.services.newItemName}
            </label>
            <input
              name="newServiceName"
              placeholder={dict.ticket.services.newItemNamePlaceholder}
              className={inputClass}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.services.quantity}
          </label>
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue="1"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.services.unitPrice}
          </label>
          <input
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.services.discount}
          </label>
          <input
            name="discount"
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
          className="text-xs font-medium text-red-600 dark:text-red-400"
        >
          {errorText(state, dict)}
        </p>
      )}
      <SubmitButton pendingLabel={dict.ticket.services.adding}>
        {dict.ticket.services.addButton}
      </SubmitButton>
    </form>
  );
}

export function TicketServicesForm({
  dict,
  lang,
  ticketId,
  services,
  catalog,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  services: TicketServiceUsage[];
  catalog: ServiceType[];
}) {
  const [adding, setAdding] = useState(false);
  const total = services.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.ticket.services.title}
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {adding ? dict.ticket.services.cancelAdd : dict.ticket.services.add}
        </button>
      </div>
      <div className="space-y-4">
        {services.length > 0 && (
          <>
            <ul className="space-y-3">
              {services.map((usage) => (
                <UsageRow
                  key={usage.id}
                  dict={dict}
                  lang={lang}
                  ticketId={ticketId}
                  usage={usage}
                />
              ))}
            </ul>
            <p className="text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {dict.ticket.services.total}: {formatCurrency(total)}
            </p>
          </>
        )}
        {adding && (
          <AddServiceForm
            dict={dict}
            lang={lang}
            ticketId={ticketId}
            catalog={catalog}
          />
        )}
      </div>
    </div>
  );
}
