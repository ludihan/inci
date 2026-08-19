"use client";

import { useCallback, useRef, useState } from "react";

export function useReportGeneration() {
  const [generating, setGenerating] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const generate = useCallback(async (url: string, filename: string) => {
    setGenerating(true);
    setError(null);
    setElapsedMs(0);
    const start = performance.now();
    intervalRef.current = setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 100);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("generic");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("generic");
    } finally {
      clearInterval(intervalRef.current);
      setGenerating(false);
    }
  }, []);

  return { generate, generating, elapsedMs, error };
}
