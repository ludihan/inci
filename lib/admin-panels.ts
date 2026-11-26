// Cookie names for the admin shell's sliding panels. Kept out of the client
// components so server layouts can read them too.
export const NAV_COOKIE = "admin_nav";
export const FILTERS_PANEL_COOKIE = "admin_filters_panel";

// Tickets per page on the admin list (a preference, kept across visits).
export const PER_PAGE_COOKIE = "admin_per_page";
export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PER_PAGE = 10;
export const MAX_PER_PAGE = 500;

export function parsePerPage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PER_PAGE ? n : DEFAULT_PER_PAGE;
}
