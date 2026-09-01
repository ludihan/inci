"use client";

import { useActionState, useState } from "react";
import {
  addTicketItemAction,
  removeTicketItemAction,
  updateTicketItemAction,
  type ActionState,
} from "@/lib/actions";
import type { Item, TicketItemUsage } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { SubmitButton } from "./submit-button";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "itemRequired") return dict.ticket.items.itemRequired;
  if (state.error === "quantityInvalid") return dict.ticket.items.quantityInvalid;
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
  usage: TicketItemUsage;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateTicketItemAction,
    undefined
  );
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      {editing ? (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="itemId" value={usage.item.id} />
          <div className="w-24">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.items.quantityShort}
            </label>
            <input name="quantity" type="number" step="0.01" min="0.01" required defaultValue={usage.quantity} className={`${inputClass} mt-0.5`} />
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.items.unitPrice}
            </label>
            <input name="unitPrice" type="number" step="0.01" min="0" defaultValue={usage.unitPrice} className={`${inputClass} mt-0.5`} />
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.items.discount}
            </label>
            <input name="discount" type="number" step="0.01" min="0" defaultValue={usage.discount} className={`${inputClass} mt-0.5`} />
          </div>
          <SubmitButton pendingLabel={dict.common.loading}>{dict.common.save}</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {dict.common.cancel}
          </button>
          {errorText(state, dict) && (
            <p role="alert" className="w-full text-xs font-medium text-red-600 dark:text-red-400">
              {errorText(state, dict)}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{usage.item.name}</p>
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
              {dict.ticket.items.edit}
            </button>
            <form action={removeTicketItemAction}>
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="ticketId" value={ticketId} />
              <input type="hidden" name="itemId" value={usage.item.id} />
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                {dict.ticket.items.remove}
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}

function AddItemForm({
  dict,
  lang,
  ticketId,
  catalog,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  catalog: Item[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addTicketItemAction,
    undefined
  );
  const [itemId, setItemId] = useState("");

  return (
    <form action={action} className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.items.fromCatalog}
          </label>
          <select
            name="itemId"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className={inputClass}
          >
            <option value="">{dict.ticket.items.newItem}</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {!itemId && (
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dict.ticket.items.newItemName}
            </label>
            <input
              name="newItemName"
              placeholder={dict.ticket.items.newItemNamePlaceholder}
              className={inputClass}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.items.quantity}
          </label>
          <input name="quantity" type="number" step="0.01" min="0.01" required defaultValue="1" className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.items.unitPrice}
          </label>
          <input name="unitPrice" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.ticket.items.discount}
          </label>
          <input name="discount" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
        </div>
      </div>
      {errorText(state, dict) && (
        <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {errorText(state, dict)}
        </p>
      )}
      <SubmitButton pendingLabel={dict.ticket.items.adding}>
        {dict.ticket.items.addButton}
      </SubmitButton>
    </form>
  );
}

export function TicketItemsForm({
  dict,
  lang,
  ticketId,
  items,
  catalog,
}: {
  dict: Dict;
  lang: Locale;
  ticketId: string;
  items: TicketItemUsage[];
  catalog: Item[];
}) {
  const [adding, setAdding] = useState(false);
  const total = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.ticket.items.title}
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {adding ? dict.ticket.items.cancelAdd : dict.ticket.items.add}
        </button>
      </div>
      <div className="space-y-4">
        {items.length > 0 && (
          <>
            <ul className="space-y-3">
              {items.map((usage) => (
                <UsageRow key={usage.id} dict={dict} lang={lang} ticketId={ticketId} usage={usage} />
              ))}
            </ul>
            <p className="text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {dict.ticket.items.total}: {formatCurrency(total)}
            </p>
          </>
        )}
        {adding && (
          <AddItemForm dict={dict} lang={lang} ticketId={ticketId} catalog={catalog} />
        )}
      </div>
    </div>
  );
}
