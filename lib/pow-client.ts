export type PowProgress = { attempts: number; elapsedMs: number };

const BATCH_SIZE = 64;
// Chaining `await Promise.all(...)` batches back-to-back never leaves the
// microtask queue, so the browser gets no chance to paint or run React's
// state updates — the tab looks frozen even though the loop is "async".
// Forcing a real macrotask yield periodically keeps the UI (and the
// progress bar) alive during the search.
const YIELD_INTERVAL_MS = 50;

function meetsDifficulty(bytes: Uint8Array, difficulty: number): boolean {
  const fullZeroBytes = difficulty >> 1;
  for (let i = 0; i < fullZeroBytes; i++) {
    if (bytes[i] !== 0) return false;
  }
  if (difficulty % 2 === 1 && (bytes[fullZeroBytes] & 0xf0) !== 0) return false;
  return true;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function solvePow(
  token: string,
  difficulty: number,
  onProgress?: (progress: PowProgress) => void
): Promise<string> {
  const encoder = new TextEncoder();
  const start = Date.now();
  let nonce = 0;
  let lastYield = start;

  for (;;) {
    const batch = Array.from({ length: BATCH_SIZE }, (_, i) => nonce + i);
    const digests = await Promise.all(
      batch.map((n) =>
        crypto.subtle.digest("SHA-256", encoder.encode(`${token}:${n}`))
      )
    );
    for (let i = 0; i < digests.length; i++) {
      if (meetsDifficulty(new Uint8Array(digests[i]), difficulty)) {
        onProgress?.({ attempts: nonce + i + 1, elapsedMs: Date.now() - start });
        return String(batch[i]);
      }
    }
    nonce += BATCH_SIZE;

    const now = Date.now();
    if (now - lastYield >= YIELD_INTERVAL_MS) {
      onProgress?.({ attempts: nonce, elapsedMs: now - start });
      await yieldToBrowser();
      lastYield = Date.now();
    }
  }
}
