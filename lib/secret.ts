export function sessionSecret(): string {
  return process.env.SESSION_SECRET || "dev-inci-secret-change-me";
}
