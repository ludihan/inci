import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Proof-of-work gate for public forms (no admin session), inspired by
// Anubis: the client must find a `solution` such that
// sha256(`${token}:${solution}`) has `difficulty` leading hex zeros before
// the server accepts the submission. Each +1 to difficulty makes solving
// ~16x slower, so keep this conservative.
const DEFAULT_DIFFICULTY = 5;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function difficulty(): number {
  const raw = Number(process.env.POW_DIFFICULTY);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_DIFFICULTY;
}

function secret(): string {
  return process.env.SESSION_SECRET || "dev-inci-secret-change-me";
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type PowChallenge = { token: string; difficulty: number };

export function createPowChallenge(): PowChallenge {
  const d = difficulty();
  const salt = randomBytes(16).toString("hex");
  const exp = Date.now() + CHALLENGE_TTL_MS;
  const body = `${salt}.${exp}.${d}`;
  const token = `${body}.${sign(body)}`;
  return { token, difficulty: d };
}

// Tracks tokens that already produced a valid solution so the same proof
// can't be replayed to bypass the gate on repeated submissions. Entries
// are pruned once their embedded expiry passes.
declare global {
  var __inciPowUsed: Map<string, number> | undefined;
}

function usedTokens(): Map<string, number> {
  if (!globalThis.__inciPowUsed) globalThis.__inciPowUsed = new Map();
  return globalThis.__inciPowUsed;
}

function pruneUsed(): void {
  const now = Date.now();
  for (const [token, exp] of usedTokens()) {
    if (exp < now) usedTokens().delete(token);
  }
}

export function verifyPowSolution(token: string, solution: string): boolean {
  if (!token || !solution) return false;
  pruneUsed();

  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [salt, expRaw, difficultyRaw, signature] = parts;
  const body = `${salt}.${expRaw}.${difficultyRaw}`;
  if (!safeEqual(sign(body), signature)) return false;

  const exp = Number(expRaw);
  const d = Number(difficultyRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (!Number.isInteger(d) || d <= 0) return false;
  if (usedTokens().has(token)) return false;

  const hash = createHash("sha256").update(`${token}:${solution}`).digest();
  const fullZeroBytes = d >> 1;
  for (let i = 0; i < fullZeroBytes; i++) {
    if (hash[i] !== 0) return false;
  }
  if (d % 2 === 1 && (hash[fullZeroBytes] & 0xf0) !== 0) return false;

  usedTokens().set(token, exp);
  return true;
}
