import { getPrimaryCompany } from "./store";
import type { Company } from "./types";

/**
 * The primary service-provider company, used as the fallback O.S. header when
 * a ticket's unit has no company of its own, and on public pages (/privacy,
 * /terms). Thin alias over the store so report/page code has a stable entry
 * point regardless of how many companies are registered.
 */
export function getCompany(): Promise<Company> {
  return getPrimaryCompany();
}

export type { Company };
