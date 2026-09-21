"use client";

import { createContext, useContext, useState } from "react";

type AddItemOpenContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AddItemOpenContext = createContext<AddItemOpenContextValue | null>(null);

export function AddItemOpenProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AddItemOpenContext.Provider value={{ open, setOpen }}>
      {children}
    </AddItemOpenContext.Provider>
  );
}

export function useAddItemOpen(): AddItemOpenContextValue | null {
  return useContext(AddItemOpenContext);
}

export function AddItemToggleButton({
  openLabel,
  closeLabel,
}: {
  openLabel: string;
  closeLabel: string;
}) {
  const ctx = useAddItemOpen();
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {ctx.open ? closeLabel : openLabel}
    </button>
  );
}
