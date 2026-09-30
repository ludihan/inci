import { getDb, inTransaction } from "./db";

// Admin login lockout. A burst of failed logins from one IP, or against one
// username from anywhere (an attacker rotating IPs), locks further attempts
// for a few seconds: short enough that an admin who mistypes barely notices,
// long enough to throttle scripted guessing. Kept in the database rather than in memory: cPanel's
// Passenger may run several app processes and restarts idle ones, and each
// process keeping its own count (or losing it on restart) multiplied how many
// passwords could be tried.
const WINDOW_MS = 30 * 1000;
const LOCK_MS = 30 * 1000;
const MAX_FAILURES_PER_IP = 5;
const MAX_FAILURES_PER_USERNAME = 10;

type Row = { failures: number; window_start: number; locked_until: number };

function keysFor(ip: string, username: string): { key: string; max: number }[] {
  const keys = [{ key: `user:${username.toLowerCase()}`, max: MAX_FAILURES_PER_USERNAME }];
  // Without a client IP every request would share one key, and a few typos
  // by anyone would lock every admin out.
  if (ip !== "unknown") keys.push({ key: `ip:${ip}`, max: MAX_FAILURES_PER_IP });
  return keys;
}

// Called before checking the password. Counts the attempt as a failure up
// front — so parallel requests can't all slip in before any failure is
// recorded — and returns 0 when it may go on, or the seconds left in the
// lockout. A successful login clears the count (clearLoginFailures).
export function claimLoginAttempt(ip: string, username: string): number {
  const db = getDb();
  const now = Date.now();
  const keys = keysFor(ip, username);
  return inTransaction(() => {
    db.prepare(
      "DELETE FROM login_attempts WHERE locked_until < ? AND window_start < ?"
    ).run(now, now - WINDOW_MS);

    const rows = keys.map(({ key, max }) => ({
      key,
      max,
      row: db
        .prepare("SELECT failures, window_start, locked_until FROM login_attempts WHERE key = ?")
        .get(key) as Row | undefined,
    }));

    const lockedUntil = Math.max(0, ...rows.map(({ row }) => row?.locked_until ?? 0));
    if (lockedUntil > now) return Math.ceil((lockedUntil - now) / 1000);

    for (const { key, max, row } of rows) {
      const fresh = !row || now - row.window_start > WINDOW_MS;
      const failures = fresh ? 1 : row.failures + 1;
      db.prepare(
        `INSERT INTO login_attempts (key, failures, window_start, locked_until)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           failures = excluded.failures,
           window_start = excluded.window_start,
           locked_until = excluded.locked_until`
      ).run(key, failures, fresh ? now : row.window_start, failures >= max ? now + LOCK_MS : 0);
    }
    return 0;
  });
}

export function clearLoginFailures(ip: string, username: string): void {
  const db = getDb();
  for (const { key } of keysFor(ip, username)) {
    db.prepare("DELETE FROM login_attempts WHERE key = ?").run(key);
  }
}
