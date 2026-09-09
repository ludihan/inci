// Tiny in-memory fixed-window rate limiter. Good enough for a single-process
// cPanel deploy; not shared across instances.

declare global {
  var __inciRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

function store() {
  if (!globalThis.__inciRateLimit) globalThis.__inciRateLimit = new Map();
  return globalThis.__inciRateLimit;
}

/**
 * Returns true when the call is allowed, false when the limit is exceeded.
 * `limit` requests are permitted per `windowMs` per `key`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const map = store();
  const entry = map.get(key);
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
