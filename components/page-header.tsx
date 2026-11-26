"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Slots in the admin top bar (see AdminNav) that pages fill with their own
// details and actions, so page headers don't take vertical space.
export const TOPBAR_DETAIL_ID = "admin-topbar-detail";
export const TOPBAR_ACTIONS_ID = "admin-topbar-actions";

function useSlot(id: string): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEl(document.getElementById(id));
  }, [id]);
  return el;
}

/**
 * Puts a page's detail line (e.g. "17 tickets") and its action buttons in the
 * top bar. Below lg the bar has no room for buttons, so they stay in a compact
 * row at the top of the page instead.
 */
export function PageHeader({
  detail,
  actions,
}: {
  detail?: string;
  actions?: React.ReactNode;
}) {
  const detailSlot = useSlot(TOPBAR_DETAIL_ID);
  const actionsSlot = useSlot(TOPBAR_ACTIONS_ID);
  return (
    <>
      {detail && detailSlot
        ? createPortal(
            <span className="flex min-w-0 items-center gap-2 motion-safe:animate-fade-in">
              <span aria-hidden className="text-zinc-300 dark:text-zinc-700">
                ·
              </span>
              <span className="truncate">{detail}</span>
            </span>,
            detailSlot
          )
        : null}
      {actions && actionsSlot
        ? createPortal(
            <span className="flex items-center gap-2 motion-safe:animate-fade-in">
              {actions}
            </span>,
            actionsSlot
          )
        : null}
      {actions ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
          {actions}
        </div>
      ) : null}
    </>
  );
}
