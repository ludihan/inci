import { lang } from "next/root-params";

const dictionaries = {
  pt: () => import("@/dictionaries/pt.json").then((m) => m.default),
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
} as const;

export type Locale = keyof typeof dictionaries;

export type Dict = Awaited<ReturnType<typeof dictionaries.pt>>;

export const locales = Object.keys(dictionaries) as Locale[];

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export async function getDict(): Promise<Dict> {
  const locale = await getLocale();
  return dictionaries[locale]();
}

export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  return hasLocale(locale) ? locale : "pt";
}
