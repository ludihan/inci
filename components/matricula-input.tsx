"use client";

import { useId, useState } from "react";
import { isValidMatricula, onlyDigits } from "@/lib/utils";

const baseClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent";

// A plain numeric input for the requester's matrícula. `maxDigits` is the
// currently configured length (Settings.matriculaDigits, passed down from a
// server component) — search/confirm screens pass a looser `validate` +
// higher `maxDigits` so a legacy 11-digit CPF is still accepted for tickets
// opened before the switch.
export function MatriculaInput({
  name = "matricula",
  id,
  required = false,
  placeholder,
  errorMessage,
  autoComplete = "off",
  maxDigits,
  validate,
}: {
  name?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  errorMessage?: string;
  autoComplete?: string;
  maxDigits: number;
  validate?: (value: string) => boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const digits = onlyDigits(value);
  const check = validate ?? ((v: string) => isValidMatricula(v, maxDigits));
  const invalid = touched && digits.length > 0 && !check(digits);

  return (
    <div>
      <input
        id={inputId}
        name={name}
        value={value}
        onChange={(e) => setValue(onlyDigits(e.target.value).slice(0, maxDigits))}
        onBlur={() => setTouched(true)}
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        // Roomier than maxDigits so a pasted, punctuation-formatted CPF still
        // reaches onChange (which strips to digits and caps at maxDigits).
        maxLength={maxDigits <= 4 ? maxDigits : maxDigits + 8}
        aria-invalid={invalid || undefined}
        className={baseClass}
      />
      {invalid && errorMessage && (
        <p
          role="alert"
          className="mt-1 text-xs font-medium text-red-600 dark:text-red-400"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
