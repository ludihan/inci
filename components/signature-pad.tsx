"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function SignatureSurface({
  canvasRef,
  width,
  height,
  onDown,
  onMove,
  onUp,
  className,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  onDown: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onMove: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onUp: () => void;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950 ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute inset-x-[4%] bg-zinc-300 dark:bg-zinc-700"
        style={{ top: "72%", height: 1 }}
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="absolute inset-0 h-full w-full touch-none"
      />
    </div>
  );
}

export function SignaturePad({
  name,
  label,
  required = false,
  fullscreenLabel,
  clearLabel,
  cancelLabel,
  doneLabel,
}: {
  name: string;
  label: string;
  required?: boolean;
  fullscreenLabel: string;
  clearLabel: string;
  cancelLabel: string;
  doneLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fsCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Below the `sm` breakpoint the fullscreen canvas is rotated 90deg (see
  // rotate-90 below) to fake landscape orientation on a portrait phone.
  // getBoundingClientRect() reflects that rotation (its width/height are
  // swapped), but a naive clientX/clientY -> rect fraction still assumes an
  // unrotated element, so touch position and drawn stroke diverge. Track
  // whether the rotation is active so point() can compensate.
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const update = () => setRotated(!mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const getContext = (canvas: HTMLCanvasElement | null) =>
    canvas?.getContext("2d") ?? null;

  const point = (
    canvas: HTMLCanvasElement,
    e: ReactPointerEvent<HTMLCanvasElement>,
    isRotated: boolean
  ) => {
    const rect = canvas.getBoundingClientRect();
    if (isRotated) {
      return {
        x: ((e.clientY - rect.top) / rect.height) * canvas.width,
        y: (1 - (e.clientX - rect.left) / rect.width) * canvas.height,
      };
    }
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (
    canvas: HTMLCanvasElement | null,
    e: ReactPointerEvent<HTMLCanvasElement>,
    isRotated: boolean
  ) => {
    e.preventDefault();
    const ctx = getContext(canvas);
    if (!ctx || !canvas) return;
    drawing.current = true;
    const { x, y } = point(canvas, e, isRotated);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.setPointerCapture(e.pointerId);
  };

  const move = (
    canvas: HTMLCanvasElement | null,
    e: ReactPointerEvent<HTMLCanvasElement>,
    isRotated: boolean
  ) => {
    if (!drawing.current || !canvas) return;
    const ctx = getContext(canvas);
    if (!ctx) return;
    const { x, y } = point(canvas, e, isRotated);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#18181b";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = (canvas: HTMLCanvasElement | null) => {
    const ctx = getContext(canvas);
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const clearMain = () => {
    clear(canvasRef.current);
    if (inputRef.current) inputRef.current.value = "";
  };

  const commitMain = () => {
    const canvas = canvasRef.current;
    if (canvas && inputRef.current) {
      inputRef.current.value = canvas.toDataURL("image/png");
    }
  };

  const openFullscreen = () => {
    setFullscreen(true);
    requestAnimationFrame(() => {
      const src = canvasRef.current;
      const dest = fsCanvasRef.current;
      const ctx = getContext(dest);
      if (!src || !dest || !ctx) return;
      clear(dest);
      if (inputRef.current?.value) {
        ctx.drawImage(src, 0, 0, dest.width, dest.height);
      }
    });
  };

  const confirmFullscreen = () => {
    const src = fsCanvasRef.current;
    const dest = canvasRef.current;
    const ctx = getContext(dest);
    if (src && dest && ctx) {
      ctx.clearRect(0, 0, dest.width, dest.height);
      ctx.drawImage(src, 0, 0, dest.width, dest.height);
      if (inputRef.current) {
        inputRef.current.value = dest.toDataURL("image/png");
      }
    }
    setFullscreen(false);
  };

  const cancelFullscreen = () => {
    setFullscreen(false);
  };

  useEffect(() => {
    if (!fullscreen) return;
    // Capture phase so this wins the Escape key before it can bubble to an
    // ancestor modal's own Escape handler and close that instead of just
    // exiting fullscreen (e.g. the ticket popup while closing a ticket).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      cancelFullscreen();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [fullscreen]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label} {required && <span className="text-zinc-400">*</span>}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openFullscreen}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {fullscreenLabel}
          </button>
          <button
            type="button"
            onClick={clearMain}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {clearLabel}
          </button>
        </div>
      </div>
      <SignatureSurface
        canvasRef={canvasRef}
        width={500}
        height={160}
        onDown={(e) => start(canvasRef.current, e, false)}
        onMove={(e) => move(canvasRef.current, e, false)}
        onUp={() => {
          end();
          commitMain();
        }}
        className="mt-1 h-40 w-full"
      />
      {/* Hidden inputs are exempt from native constraint validation, so
          "required" here is informational only — the enclosing form and
          the server enforce it. */}
      <input ref={inputRef} type="hidden" name={name} />

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex bg-white sm:items-center sm:justify-center sm:bg-zinc-900/50 sm:p-6 dark:bg-zinc-950 dark:sm:bg-black/60">
          <div className="fixed left-1/2 top-1/2 flex h-[100vw] w-[100vh] -translate-x-1/2 -translate-y-1/2 rotate-90 flex-col sm:static sm:h-[500px] sm:w-full sm:max-w-3xl sm:translate-x-0 sm:translate-y-0 sm:rotate-0 sm:rounded-2xl sm:bg-white sm:shadow-2xl dark:sm:bg-zinc-900">
            <div className="flex items-center justify-between px-4 py-2 sm:px-5 sm:py-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => clear(fsCanvasRef.current)}
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {clearLabel}
                </button>
                <button
                  type="button"
                  onClick={cancelFullscreen}
                  className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={confirmFullscreen}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {doneLabel}
                </button>
              </div>
            </div>
            <SignatureSurface
              canvasRef={fsCanvasRef}
              width={1400}
              height={448}
              onDown={(e) => start(fsCanvasRef.current, e, rotated)}
              onMove={(e) => move(fsCanvasRef.current, e, rotated)}
              onUp={end}
              className="mx-4 mb-4 flex-1 sm:mx-5 sm:mb-5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
