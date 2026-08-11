import { randomBytes } from "crypto";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
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
  const digits = onlyDigits(value);
  if (digits.length !== 11) return digits;
  return digits.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    "$1.$2.$3-$4"
  );
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

export function formatDate(
  value: string,
  locale: "pt" | "en"
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

export function formatDateTime(value: string, locale?: "pt" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (locale === "en") {
    return `${MONTHS_EN[date.getMonth()]} ${pad(date.getDate())}, ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
