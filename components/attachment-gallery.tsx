"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Attachment } from "@/lib/types";
import type { Dict } from "@/lib/i18n";

export function AttachmentGallery({
  attachments,
  dict,
  alt,
}: {
  attachments: Attachment[];
  dict: Dict;
  alt: string;
}) {
  const a = dict.attachments;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const preview = previewIndex !== null ? attachments[previewIndex] : null;

  const showPrev = () =>
    setPreviewIndex((i) =>
      i === null ? null : (i - 1 + attachments.length) % attachments.length
    );
  const showNext = () =>
    setPreviewIndex((i) => (i === null ? null : (i + 1) % attachments.length));

  useEffect(() => {
    if (previewIndex === null) return;
    const count = attachments.length;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPreviewIndex(null);
      }
      if (e.key === "ArrowLeft") setPreviewIndex((i) => (i === null ? null : (i - 1 + count) % count));
      if (e.key === "ArrowRight") setPreviewIndex((i) => (i === null ? null : (i + 1) % count));
    };
    // Capture phase so Escape closes just this lightbox, not an ancestor
    // modal (e.g. the ticket popup) whose own Escape handler is on bubble.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [previewIndex, attachments.length]);

  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {attachments.map((att, i) =>
        att.kind === "image" ? (
          <button
            key={att.id}
            type="button"
            onClick={() => setPreviewIndex(i)}
            className="block"
          >
            <span className="relative block h-40 w-40 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-800">
              <Image src={att.path} alt={alt} fill sizes="160px" className="object-cover" />
            </span>
          </button>
        ) : (
          <button
            key={att.id}
            type="button"
            onClick={() => setPreviewIndex(i)}
            className="block"
          >
            <video
              src={att.path}
              className="h-40 w-64 rounded-xl bg-black object-contain ring-1 ring-zinc-200 dark:ring-zinc-800"
            />
          </button>
        )
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute right-5 top-5 text-3xl leading-none text-white/80 hover:text-white"
            aria-label={a.close}
          >
            &times;
          </button>
          {attachments.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label={a.prev}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-4xl leading-none text-white/80 hover:text-white"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label={a.next}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-4xl leading-none text-white/80 hover:text-white"
              >
                &#8250;
              </button>
            </>
          )}
          {preview.kind === "image" ? (
            <div
              key={preview.id}
              className="relative h-full max-h-[85vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={preview.path} alt={alt} fill sizes="100vw" className="object-contain" />
            </div>
          ) : (
            <video
              key={preview.id}
              src={preview.path}
              controls
              autoPlay
              className="max-h-[85vh] max-w-4xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
