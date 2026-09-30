"use client";

import { useEffect } from "react";

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

// Stops the page behind an overlay from scrolling while `active`.
//
// The page scrolls on <html>, not <body> (see app/layout.tsx), so hiding
// <body>'s overflow did nothing: the list kept scrolling behind the ticket
// panel, and on phones that scroll also slid the browser's address bar in
// and out, resizing the overlay under the finger. Overlays nest (the
// signature's fullscreen inside the ticket), so the lock is counted and only
// the last one out restores the page.
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    if (locks++ === 0) {
      saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
      // Hiding a classic (desktop) scrollbar widens the page; pad it back so
      // the content behind the overlay doesn't jump sideways.
      const scrollbar = window.innerWidth - root.clientWidth;
      root.style.overflow = "hidden";
      if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        root.style.overflow = saved.overflow;
        root.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}
