"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useScrollLock } from "@/components/use-scroll-lock";

type Point = { x: number; y: number };

type Stroke = {
  pointerId: number;
  pointerType: string;
  // Latest sample, and where the ink stops for now: the line is drawn as
  // curves between the midpoints of consecutive samples, so it trails the
  // pointer by half a segment until the stroke ends.
  last: Point;
  inkEnd: Point;
  moved: boolean;
};

// Every signature is saved as a PNG of exactly this size (the ticket and the
// PDF show it at these proportions). On screen the signing area keeps them
// too, as large as fits in its box, and the leftover space around it shows
// as bands: stretching the area to the box's shape, which varies with the
// screen, distorted the signature.
const SIGNATURE_WIDTH = 500;
const SIGNATURE_HEIGHT = 160;

const INK_COLOR = "#18181b";
// In pixels of the saved image, so a signature comes out equally thick
// whatever the size of the pad it was drawn on.
const INK_WIDTH = 2;

function SignatureSurface({
  canvasRef,
  rotated = false,
  onStroke,
  className,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  // The canvas is shown rotated 90deg (see the fullscreen pad below).
  // getBoundingClientRect() reflects that rotation (its width/height are
  // swapped), but a naive clientX/clientY -> rect fraction still assumes an
  // unrotated element, so touch position and drawn stroke would diverge.
  rotated?: boolean;
  // Called after each finished stroke, i.e. whenever ink was added.
  onStroke?: () => void;
  className?: string;
}) {
  const stroke = useRef<Stroke | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const toPoint = (
    canvas: HTMLCanvasElement,
    rect: DOMRect,
    e: { clientX: number; clientY: number }
  ): Point => {
    if (rotated) {
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

  const finish = () => {
    const current = stroke.current;
    const ctx = canvasRef.current?.getContext("2d");
    stroke.current = null;
    if (!current || !ctx) return;
    ctx.beginPath();
    if (current.moved) {
      ctx.moveTo(current.inkEnd.x, current.inkEnd.y);
      ctx.lineTo(current.last.x, current.last.y);
      ctx.stroke();
    } else {
      // A tap with no movement still leaves a dot.
      ctx.arc(current.last.x, current.last.y, ctx.lineWidth, 0, Math.PI * 2);
      ctx.fill();
    }
    onStroke?.();
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const current = stroke.current;
    if (current) {
      // One pointer draws at a time. A second finger or the palm landing
      // mid-stroke used to feed the same line, which zigzagged between the
      // two in straight segments. Only a pen takes over, from the palm that
      // touched down before it.
      if (e.pointerType !== "pen" || current.pointerType !== "touch") return;
      finish();
    }
    e.preventDefault();
    ctx.lineWidth = INK_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK_COLOR;
    ctx.fillStyle = INK_COLOR;
    const start = toPoint(canvas, canvas.getBoundingClientRect(), e);
    stroke.current = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      last: start,
      inkEnd: start,
      moved: false,
    };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone; the stroke ends on pointerleave instead.
    }
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = stroke.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!current || current.pointerId !== e.pointerId || !canvas || !ctx) return;
    // The browser delivers at most one pointermove per frame and folds every
    // position sampled in between into it. Drawing only the event itself
    // joins those frames with straight lines — long ones when the pointer is
    // fast or the page drops frames — so draw each sample it carries.
    const native = e.nativeEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const samples = coalesced.length > 0 ? coalesced : [native];
    const rect = canvas.getBoundingClientRect();
    for (const sample of samples) {
      const next = toPoint(canvas, rect, sample);
      if (next.x === current.last.x && next.y === current.last.y) continue;
      // Each piece is its own path: extending a single path and stroking it
      // again on every move repaints the whole signature each time.
      const mid = {
        x: (current.last.x + next.x) / 2,
        y: (current.last.y + next.y) / 2,
      };
      ctx.beginPath();
      ctx.moveTo(current.inkEnd.x, current.inkEnd.y);
      ctx.quadraticCurveTo(current.last.x, current.last.y, mid.x, mid.y);
      ctx.stroke();
      current.last = next;
      current.inkEnd = mid;
      current.moved = true;
    }
  };

  const up = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stroke.current?.pointerId === e.pointerId) finish();
  };

  // Layout effect, so the area already has its size when first painted.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const area = areaRef.current;
    if (!box || !area) return;
    const fit = () => {
      // clientWidth/Height ignore the fullscreen pad's rotation, so this
      // fits the area in the box's own (unrotated) frame.
      const width = Math.min(
        box.clientWidth,
        (box.clientHeight * SIGNATURE_WIDTH) / SIGNATURE_HEIGHT
      );
      area.style.width = `${width}px`;
      area.style.height = `${(width * SIGNATURE_HEIGHT) / SIGNATURE_WIDTH}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className={`flex items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 ${className ?? ""}`}
    >
      <div ref={areaRef} className="relative h-full w-full shrink-0 bg-white">
        <div
          className="pointer-events-none absolute inset-x-[4%] bg-zinc-300"
          style={{ top: "72%", height: 1 }}
        />
        <canvas
          ref={canvasRef}
          width={SIGNATURE_WIDTH}
          height={SIGNATURE_HEIGHT}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          onLostPointerCapture={up}
          className="absolute inset-0 h-full w-full touch-none select-none"
        />
      </div>
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
  // Whether the fullscreen canvas holds any ink, so confirming an empty one
  // doesn't count as a signature.
  const fsInked = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Below the `sm` breakpoint the fullscreen canvas is rotated 90deg (see
  // rotate-90 below) to fake landscape orientation on a portrait phone.
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const update = () => setRotated(!mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useScrollLock(fullscreen);

  const getContext = (canvas: HTMLCanvasElement | null) =>
    canvas?.getContext("2d") ?? null;

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
      fsInked.current = Boolean(inputRef.current?.value);
      if (fsInked.current) ctx.drawImage(src, 0, 0);
    });
  };

  const clearFullscreen = () => {
    clear(fsCanvasRef.current);
    fsInked.current = false;
  };

  const confirmFullscreen = () => {
    if (!fsInked.current) {
      clearMain();
      setFullscreen(false);
      return;
    }
    const src = fsCanvasRef.current;
    const dest = canvasRef.current;
    const ctx = getContext(dest);
    if (src && dest && ctx) {
      ctx.clearRect(0, 0, dest.width, dest.height);
      ctx.drawImage(src, 0, 0);
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
    // exiting fullscreen (e.g. the ticket panel while closing a ticket).
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
        onStroke={commitMain}
        className="mt-1 h-40 w-full"
      />
      {/* Hidden inputs are exempt from native constraint validation, so
          "required" here is informational only — the enclosing form and
          the server enforce it. */}
      <input ref={inputRef} type="hidden" name={name} />

      {/* On a phone the pad is turned sideways, so its length is the screen's
          height: 100dvh, which follows the browser's address bar, rather
          than 100vh, which is measured with the bar hidden and pushed both
          ends (the label and the done button) off the visible screen. Phones held
          sideways get the sm layout, capped to the height they have. */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex bg-white sm:items-center sm:justify-center sm:bg-zinc-900/50 sm:p-6 dark:bg-zinc-950 dark:sm:bg-black/60">
          <div
            className="fixed left-1/2 top-1/2 flex h-[100vw] w-[100vh] -translate-x-1/2 max-sm:supports-[width:100dvh]:w-[100dvh] -translate-y-1/2 rotate-90 flex-col sm:static sm:h-[500px] sm:max-h-full sm:w-full sm:max-w-3xl sm:translate-x-0 sm:translate-y-0 sm:rotate-0 sm:rounded-lg sm:bg-white sm:shadow-2xl dark:sm:bg-zinc-900"
          >
            <div className="flex items-center justify-between px-4 py-2 sm:px-5 sm:py-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={clearFullscreen}
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
              rotated={rotated}
              onStroke={() => {
                fsInked.current = true;
              }}
              className="mx-4 mb-4 flex-1 sm:mx-5 sm:mb-5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
