import { randomBytes } from "crypto";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function caretPositionForDigitCount(
  formatted: string,
  digitCount: number
): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(cpf[10], 10);
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// A matrícula's digit length is admin-configurable (Settings.matriculaDigits,
// default 4) — pass the current setting down; this only defaults to 4 for
// call sites that don't have it handy (e.g. quick validation before settings load).
export function isValidMatricula(value: string, digits = 4): boolean {
  return new RegExp(`^\\d{${digits}}$`).test(onlyDigits(value));
}

// Accepts a matrícula (at the given digit length) OR a legacy 11-digit CPF.
// Used everywhere a requester identifies an existing ticket (search, confirm,
// PDF link) so tickets opened before the matrícula switch stay reachable.
// Opening a new ticket uses isValidMatricula only — CPF is no longer accepted there.
export function isValidRequesterCode(value: string, digits = 4): boolean {
  return isValidMatricula(value, digits) || isValidCpf(value);
}

// Renders a legacy 11-digit value as a formatted CPF; a matrícula stays as-is.
export function formatRequesterCode(value: string): string {
  const d = onlyDigits(value);
  return d.length === 11 ? formatCpf(d) : d;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const check = (len: number) => {
    let sum = 0;
    let weight = len - 7;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cnpj[i], 10) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (check(12) !== parseInt(cnpj[12], 10)) return false;
  return check(13) === parseInt(cnpj[13], 10);
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return digits;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)$/, "($1) $2");
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d+)$/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d+)$/, "($1) $2-$3");
}

export function randomCode(prefix: string, segments = 2, length = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parts: string[] = [];
  for (let s = 0; s < segments; s++) {
    let part = "";
    for (let i = 0; i < length; i++) {
      part += alphabet[randomBytes(1)[0] % alphabet.length];
    }
    parts.push(part);
  }
  return `${prefix}-${parts.join("-")}`;
}

export function generateTicketId(): string {
  return randomCode("TCK", 1, 8);
}

export function generateComplaintCode(): string {
  return randomCode("DEN", 2, 4);
}

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function offsetLabel(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  return raw.replace("GMT", "UTC");
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function dayNumber(p: { year: string; month: string; day: string }): number {
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86400000;
}

export function formatDate(
  value: string,
  locale: "pt" | "en",
  timeZone?: string
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (!timeZone) {
    const now = new Date();
    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
      (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24)
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (diffDays === 0) {
      return locale === "pt" ? `hoje, ${time}` : `today, ${time}`;
    }
    if (diffDays === 1) {
      return locale === "pt" ? `ontem, ${time}` : `yesterday, ${time}`;
    }

    if (locale === "pt") {
      return `${pad(date.getDate())} ${MONTHS_PT[date.getMonth()]} ${date.getFullYear()} ${time}`;
    }
    return `${MONTHS_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}, ${time}`;
  }

  const p = zonedParts(date, timeZone);
  const diffDays = dayNumber(zonedParts(new Date(), timeZone)) - dayNumber(p);
  const time = `${p.hour}:${p.minute} (${offsetLabel(date, timeZone)})`;
  if (diffDays === 0) return locale === "pt" ? `hoje, ${time}` : `today, ${time}`;
  if (diffDays === 1) return locale === "pt" ? `ontem, ${time}` : `yesterday, ${time}`;

  if (locale === "pt") {
    return `${p.day} ${MONTHS_PT[Number(p.month) - 1]} ${p.year} ${time}`;
  }
  return `${MONTHS_EN[Number(p.month) - 1]} ${Number(p.day)}, ${p.year}, ${time}`;
}

export function formatDateTime(
  value: string,
  locale?: "pt" | "en",
  timeZone?: string
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (!timeZone) {
    if (locale === "en") {
      return `${MONTHS_EN[date.getMonth()]} ${pad(date.getDate())}, ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const p = zonedParts(date, timeZone);
  const suffix = `(${offsetLabel(date, timeZone)})`;
  if (locale === "en") {
    return `${MONTHS_EN[Number(p.month) - 1]} ${p.day}, ${p.year} ${p.hour}:${p.minute} ${suffix}`;
  }
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute} ${suffix}`;
}
