import { getCompanySettings } from "./store";
import type { Company } from "./types";

/**
 * Service-provider company shown on the Ordem de Serviço (Service Order) PDFs.
 * Thin alias over the store so report code has a stable entry point.
 */
export function getCompany(): Promise<Company> {
  return getCompanySettings();
}

export type { Company };
