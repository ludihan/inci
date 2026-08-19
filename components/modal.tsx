"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Modal({
  children,
  title,
  closeLabel,
  onClose,
}: {
  children: React.ReactNode;
  title?: string;
  closeLabel?: string;
  onClose?: () => void;
}) {
  const router = useRouter();

  const close = onClose ?? (() => router.back());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 py-8 backdrop-blur-sm sm:items-center dark:bg-black/60">
      <div className="absolute inset-0" onClick={close} aria-hidden="true" />
      <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-50 shadow-2xl dark:bg-zinc-900">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
