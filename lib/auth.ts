import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAdminById } from "./store";
import type { Admin, Module, TicketType } from "./types";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function makeToken(payload: { adminId: string; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string): { adminId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!safeEqual(sign(body), signature)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8")
    ) as { adminId: string; exp: number };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return { adminId: payload.adminId };
  } catch {
    return null;
  }
}

export async function createSession(adminId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = makeToken({
    adminId,
    exp: Date.now() + SESSION_TTL_MS,
  });
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentAdmin(): Promise<Admin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return getAdminById(payload.adminId);
}

export function hasPermission(admin: Admin, module: Module): boolean {
  return admin.permissions.includes(module);
}

export function moduleForTicketType(type: TicketType): Module {
  return type;
}

export function isSuperAdmin(admin: Admin): boolean {
  return admin.role === "superadmin";
}
