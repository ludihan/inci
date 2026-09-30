"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/components/use-scroll-lock";

// The ticket opened from the list (the intercepted /[lang]/admin/tickets/[id]
// route): a panel sliding in from the right on larger screens, and a page of
// its own covering the whole screen on phones. It scrolls inside itself with
// the list locked behind it, so on a phone the browser's address bar stays
// put while the ticket is open, and `fixed inset-0` keeps it the size of the
// visible screen whether the bar is showing or not.
//
// Nothing above the content may keep a transform, filter or backdrop-filter
// once the panel is in place: those make the panel the containing block of
// the `position: fixed` overlays inside it (the fullscreen signature, the
// photo viewer), which would then open inside the panel instead of over the
// whole screen. The slide-in animation leaves no transform behind.
export function TicketDrawer({
  children,
  title,
  closeLabel,
  backLabel,
}: {
  children: React.ReactNode;
  title: string;
  closeLabel: string;
  backLabel: string;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => router.back();

  useScrollLock();

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 hidden bg-zinc-900/40 motion-safe:animate-fade-in sm:block dark:bg-black/60"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col bg-zinc-50 outline-none motion-safe:animate-slide-in-right sm:max-w-2xl sm:border-l sm:border-zinc-200 sm:shadow-2xl dark:bg-zinc-950 dark:sm:border-zinc-800"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-2 sm:px-5 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            type="button"
            onClick={close}
            aria-label={backLabel}
            className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:hidden dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="hidden rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 sm:block dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
