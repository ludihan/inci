"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function AdminLiveUpdates() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const source = new EventSource("/api/admin/events/stream");

    source.addEventListener("admin-changed", () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), 200);
    });

    return () => {
      clearTimeout(debounceRef.current);
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
