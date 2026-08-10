"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export function FileInput({
  name,
  id,
  required = false,
  optionalLabel,
  requiredLabel,
  help,
}: {
  name: string;
  id: string;
  required?: boolean;
  optionalLabel?: string;
  requiredLabel?: string;
  help?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        id={id}
        accept="image/jpeg,image/png,image/webp,image/gif"
        required={required}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreview(URL.createObjectURL(file));
          } else {
            setPreview(null);
          }
        }}
        className="block w-full cursor-pointer rounded-lg border border-zinc-300 bg-white text-sm text-zinc-600 file:mr-3 file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:file:bg-zinc-50 dark:file:text-zinc-900"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {preview && (
          <span className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-800">
            <Image
              src={preview}
              alt="Pré-visualização"
              fill
              unoptimized
              sizes="96px"
              className="object-cover"
            />
          </span>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {required ? requiredLabel : optionalLabel}
          {help ? ` · ${help}` : ""}
        </p>
      </div>
    </div>
  );
}
