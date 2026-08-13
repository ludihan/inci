"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { getPowChallenge } from "@/lib/actions";
import { solvePow, type PowProgress } from "@/lib/pow-client";

export type PowGateProgress = PowProgress & { difficulty: number };

// Wires a proof-of-work challenge into a form submission: intercepts the
// first submit, solves the challenge (reporting progress), fills the
// hidden powToken/powSolution inputs, then resubmits so the form's own
// action (server action) runs normally with the proof attached.
export function usePowGate() {
  const [solving, setSolving] = useState(false);
  const [progress, setProgress] = useState<PowGateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const solutionInputRef = useRef<HTMLInputElement>(null);
  const skipRef = useRef(false);

  const run = useCallback(async (form: HTMLFormElement) => {
    setSolving(true);
    setError(null);
    try {
      const { token, difficulty } = await getPowChallenge();
      setProgress({ attempts: 0, elapsedMs: 0, difficulty });
      const solution = await solvePow(token, difficulty, (p) =>
        setProgress({ ...p, difficulty })
      );
      if (tokenInputRef.current) tokenInputRef.current.value = token;
      if (solutionInputRef.current) solutionInputRef.current.value = solution;
      setSolving(false);
      skipRef.current = true;
      form.requestSubmit();
    } catch {
      setSolving(false);
      setError("powFailed");
    }
  }, []);

  // Call from the form's onSubmit. `validate` runs first and should
  // return false (after setting its own error state) to block submission.
  const guardSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>, validate?: () => boolean) => {
      if (skipRef.current) {
        skipRef.current = false;
        return;
      }
      e.preventDefault();
      if (validate && !validate()) return;
      void run(e.currentTarget);
    },
    [run]
  );

  return {
    guardSubmit,
    solving,
    progress,
    error,
    tokenInputRef,
    solutionInputRef,
  };
}
