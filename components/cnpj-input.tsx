"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  caretPositionForDigitCount,
  formatCnpj,
  isValidCnpj,
  onlyDigits,
} from "@/lib/utils";

const baseClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent";

export function CnpjInput({
  name = "cnpj",
  id,
  required = false,
  placeholder = "00.000.000/0000-00",
  errorMessage,
  defaultValue = "",
  ariaLabel,
  autoComplete = "off",
}: {
  name?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  errorMessage?: string;
  defaultValue?: string;
  ariaLabel?: string;
  autoComplete?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const [value, setValue] = useState(() => formatCnpj(defaultValue));
  const [touched, setTouched] = useState(false);

  const digits = onlyDigits(value);
  const invalid = touched && digits.length > 0 && !isValidCnpj(digits);

  useEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  }, [value]);

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const caret = e.target.selectionStart ?? raw.length;
          const digitsBeforeCaret = onlyDigits(raw.slice(0, caret)).length;
          const formatted = formatCnpj(onlyDigits(raw));
          caretRef.current = caretPositionForDigitCount(
            formatted,
            digitsBeforeCaret
          );
          setValue(formatted);
        }}
        onBlur={() => setTouched(true)}
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        maxLength={18}
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
