"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";

type Kind = "image" | "video";

const ACCEPT: Record<Kind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
};

function MultiFilePicker({
  name,
  kind,
  max,
  maxSizeMB,
  title,
  help,
  a,
}: {
  name: string;
  kind: Kind;
  max: number;
  maxSizeMB: number;
  title: string;
  help: string;
  a: Dict["attachments"];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const showPrev = () =>
    setPreviewIndex((i) => (i === null ? null : (i - 1 + files.length) % files.length));
  const showNext = () =>
    setPreviewIndex((i) => (i === null ? null : (i + 1) % files.length));

  useEffect(() => {
    if (previewIndex === null) return;
    const count = files.length;
    // Capture phase + stopPropagation so Escape closes only this lightbox,
    // not an ancestor modal (e.g. the ticket popup) it happens to be nested
    // inside.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPreviewIndex(null);
      }
      if (e.key === "ArrowLeft") setPreviewIndex((i) => (i === null ? null : (i - 1 + count) % count));
      if (e.key === "ArrowRight") setPreviewIndex((i) => (i === null ? null : (i + 1) % count));
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [previewIndex, files.length]);

  function sync(next: File[]) {
    setFiles(next);
    const dt = new DataTransfer();
    next.forEach((file) => dt.items.add(file));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    let combined = [...files, ...selected];
    let err: string | null = null;

    if (combined.length > max) {
      err = (kind === "image" ? a.tooManyImages : a.tooManyVideos).replace(
        "{max}",
        String(max)
      );
      combined = combined.slice(0, max);
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (combined.some((f) => f.size > maxBytes)) {
      err = (kind === "image" ? a.tooLargeImage : a.tooLargeVideo).replace(
        "{max}",
        String(maxSizeMB)
      );
      combined = combined.filter((f) => f.size <= maxBytes);
    }

    setError(err);
    sync(combined);
  }

  function remove(index: number) {
    setError(null);
    sync(files.filter((_, i) => i !== index));
    setPreviewIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  const upToLabel = a.upTo
    .replace("{max}", String(max))
    .replace("{label}", kind === "image" ? a.imagesLabel : a.videosLabel)
    .replace("{size}", String(maxSizeMB));

  return (
    <div>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</label>
      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple
        accept={ACCEPT[kind]}
        onChange={handleChange}
        className="mt-1 block w-full cursor-pointer rounded-lg border border-zinc-300 bg-white text-sm text-zinc-600 file:mr-3 file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
      />
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${file.lastModified}-${i}`}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-800"
            >
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                className="relative block h-full w-full"
                aria-label={a.enlarge}
              >
                {kind === "image" ? (
                  <Image
                    src={previews[i]}
                    alt=""
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <video src={previews[i]} className="h-full w-full object-cover" muted />
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={a.remove}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {help} · {upToLabel}
      </p>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}

      {previewIndex !== null && (
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
          {files.length > 1 && (
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
          {kind === "image" ? (
            <div
              key={previewIndex}
              className="relative h-full max-h-[85vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={previews[previewIndex]}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                className="object-contain"
              />
            </div>
          ) : (
            <video
              key={previewIndex}
              src={previews[previewIndex]}
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

export function MultiFileInput({
  dict,
  imagesName = "images",
  videosName = "videos",
  maxImages = 5,
  maxVideos = 5,
}: {
  dict: Dict;
  imagesName?: string;
  videosName?: string;
  maxImages?: number;
  maxVideos?: number;
}) {
  const a = dict.attachments;
  return (
    <div className="space-y-4">
      <MultiFilePicker
        name={imagesName}
        kind="image"
        max={maxImages}
        maxSizeMB={5}
        title={a.photos}
        help={a.photosHelp}
        a={a}
      />
      <MultiFilePicker
        name={videosName}
        kind="video"
        max={maxVideos}
        maxSizeMB={50}
        title={a.videos}
        help={a.videosHelp}
        a={a}
      />
    </div>
  );
}
