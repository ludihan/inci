import { createHmac, timingSafeEqual } from "crypto";
import { sessionSecret } from "./secret";
import { onlyDigits } from "./utils";

// The raw requester code (a matrícula, or a legacy 11-digit CPF on tickets
// opened before the switch) is never stored. We keep only this keyed hash.
//
// It's a deterministic HMAC rather than a per-row salted hash so tickets can
// still be found with `WHERE matricula_hash = ?`. Keying it with
// SESSION_SECRET means a database leak on its own doesn't let an attacker
// brute-force the small code space offline.
export function hashMatricula(code: string): string {
  return createHmac("sha256", sessionSecret())
    .update(onlyDigits(code))
    .digest("hex");
}

// Constant-time compare of a raw code against a stored hash.
export function matriculaMatches(code: string, storedHash: string): boolean {
  const a = Buffer.from(hashMatricula(code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
