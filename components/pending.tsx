"use client";

import { useLinkStatus } from "next/link";

export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

/** Inside a `<Link>`: spins while the page it opens is loading. */
export function LinkPendingHint({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`inline-flex h-3.5 w-3.5 shrink-0 transition-opacity ${
        pending ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {pending && <Spinner />}
    </span>
  );
}
