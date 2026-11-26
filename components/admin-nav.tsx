"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/lib/actions";
import { NAV_COOKIE } from "@/lib/admin-panels";
import type { Dict, Locale } from "@/lib/i18n";
import { useOptionalAdminFilters } from "@/components/admin-filters";
import { TOPBAR_ACTIONS_ID, TOPBAR_DETAIL_ID } from "@/components/page-header";
import { LinkPendingHint } from "@/components/pending";
import { useIsDesktop, writePanelCookie } from "@/components/use-panels";
import { announceAdminLogout } from "@/components/admin-live-updates";
import {
  AdminNotificationBanner,
  AdminNotificationStatus,
} from "@/components/admin-notification-prompt";
import {
  useNotificationPermission,
  type NotificationPermissionState,
} from "@/components/use-admin-notifications";
import { ThemeToggle } from "@/components/theme-toggle";

const DISMISSED_KEY = "admin-notification-banner-dismissed";

function readDismissed(): NotificationPermissionState | null {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) as NotificationPermissionState | null;
  } catch {
    return null;
  }
}

function writeDismissed(value: NotificationPermissionState | null): void {
  try {
    if (value) sessionStorage.setItem(DISMISSED_KEY, value);
    else sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    // Storage blocked: the dismissal just won't survive a reload.
  }
}

export type AdminNavIcon =
  | "dashboard"
  | "tickets"
  | "complaints"
  | "reports"
  | "units"
  | "areas"
  | "items"
  | "serviceTypes"
  | "company"
  | "users"
  | "settings"
  | "sql";

export type AdminNavGroup = {
  label: string;
  links: { href: string; label: string; icon: AdminNavIcon }[];
};

export type AdminNavLabels = {
  appName: string;
  logout: string;
  language: string;
  theme: { light: string; dark: string; system: string };
  openMenu: string;
  closeMenu: string;
  collapseMenu: string;
  backToSite: string;
  notifications: Dict["admin"]["notifications"];
};

const ICON_PATHS: Record<AdminNavIcon, string> = {
  dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  tickets:
    "M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1zM14 5v14",
  complaints:
    "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12zM12 8v4M12 16h.01",
  reports: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  units:
    "M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M2 21h20M8 8h2M8 12h2M8 16h2",
  areas:
    "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  items: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  serviceTypes:
    "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2.4-.6-.6-2.4z",
  company:
    "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1M10 21v-4h4v4",
  users:
    "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  sql: "M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14",
};

function Icon({
  d,
  className = "h-4 w-4",
}: {
  d: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function AdminNav({
  lang,
  adminName,
  logo,
  groups,
  labels,
  initialNavOpen,
  topBarActions,
  topBarRight,
  rightPanel,
  children,
}: {
  lang: Locale;
  adminName: string;
  logo: string | null;
  groups: AdminNavGroup[];
  labels: AdminNavLabels;
  initialNavOpen: boolean;
  /** Phone-only controls on the right of the top bar. */
  topBarActions?: React.ReactNode;
  /** Desktop-only right corner of the top bar (the filter panel's header). */
  topBarRight?: React.ReactNode;
  /** A panel docked to the right edge (it renders and slides itself). */
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const filtersCtx = useOptionalAdminFilters();
  const rightPanelOpen = filtersCtx?.visibleHere ?? false;
  const refreshing = filtersCtx?.pending ?? false;
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const otherLocale: Locale = lang === "pt" ? "en" : "pt";
  const permission = useNotificationPermission();
  const [dismissed, setDismissed] = useState<NotificationPermissionState | null>(
    () => (typeof window === "undefined" ? null : readDismissed())
  );

  const visible = isDesktop ? navOpen : mobileOpen;

  const toggleNav = () => {
    if (isDesktop) {
      setNavOpen((v) => {
        writePanelCookie(NAV_COOKIE, !v);
        return !v;
      });
    } else {
      setMobileOpen((v) => !v);
    }
  };

  const dismissBanner = () => {
    setDismissed(permission);
    writeDismissed(permission);
  };

  const showBanner = () => {
    setDismissed(null);
    writeDismissed(null);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const dashboardHref = `/${lang}/admin`;
  const isActive = (href: string) =>
    href === dashboardHref
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const activeLink = groups.flatMap((g) => g.links).find((l) => isActive(l.href));
  const wideMain =
    pathname === `/${lang}/admin/tickets` ||
    pathname.startsWith(`/${lang}/admin/tickets/`);

  function switchLanguage() {
    const segments = pathname.split("/");
    segments[1] = otherLocale;
    router.push(segments.join("/"));
  }

  const brand = (
    <span className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
      {logo ? (
        <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
          <Image
            src={logo}
            alt={labels.appName}
            fill
            sizes="28px"
            className="object-contain"
          />
        </span>
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
          {labels.appName.charAt(0)}
        </span>
      )}
      <span className="truncate">{labels.appName}</span>
    </span>
  );

  return (
    <div className="min-h-dvh bg-zinc-50/60 dark:bg-black">
      {/* Top bar, full width. On desktop its corners are the left menu and
          right filter panel headers; only the panels below them slide. */}
      <header className="sticky top-0 z-40 flex h-14 items-stretch border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={toggleNav}
          aria-label={navOpen ? labels.collapseMenu : labels.openMenu}
          aria-expanded={navOpen}
          aria-controls="admin-nav"
          title={navOpen ? labels.collapseMenu : labels.openMenu}
          className="group hidden w-72 shrink-0 items-center justify-between gap-2 overflow-hidden border-r border-zinc-200 px-4 text-left transition-colors hover:bg-zinc-50 lg:flex dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          {brand}
          <span className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-50">
            <Icon
              d="M15 18l-6-6 6-6"
              className={`h-4 w-4 transition-transform duration-300 ease-panel ${navOpen ? "" : "rotate-180"}`}
            />
          </span>
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleNav}
              aria-label={visible ? labels.closeMenu : labels.openMenu}
              aria-expanded={visible}
              aria-controls="admin-nav"
              title={visible ? labels.closeMenu : labels.openMenu}
              className="shrink-0 rounded-md border border-zinc-200 bg-white p-2 text-zinc-700 transition-colors hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Icon d="M4 7h16M4 12h16M4 17h16" className="h-4 w-4" />
            </button>
            <div className="lg:hidden">{brand}</div>
            {activeLink && (
              <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
                {pathname === activeLink.href ? (
                  <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {activeLink.label}
                  </h1>
                ) : (
                  <Link
                    href={activeLink.href}
                    className="truncate text-base font-semibold tracking-tight text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {activeLink.label}
                  </Link>
                )}
                <span
                  id={TOPBAR_DETAIL_ID}
                  className="hidden min-w-0 items-center gap-2 font-medium text-zinc-500 sm:flex dark:text-zinc-400"
                />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div id={TOPBAR_ACTIONS_ID} className="hidden items-center gap-2 lg:flex" />
            {topBarActions && <div className="lg:hidden">{topBarActions}</div>}
          </div>
        </div>

        {topBarRight}
      </header>

      {/* Backdrop for the phone drawer */}
      <button
        type="button"
        aria-label={labels.closeMenu}
        tabIndex={-1}
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-[45] bg-black/40 transition-opacity duration-300 ease-out lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Left navigation panel: slides in/out smoothly on every screen size */}
      <aside
        id="admin-nav"
        aria-label={labels.appName}
        inert={!visible}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r border-zinc-200 bg-white shadow-xl transition-transform duration-300 ease-panel will-change-transform motion-reduce:transition-none lg:top-14 lg:z-30 lg:max-w-none lg:shadow-none dark:border-zinc-800 dark:bg-zinc-950 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${navOpen ? "lg:translate-x-0" : "lg:-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={toggleNav}
            aria-label={labels.closeMenu}
            title={labels.closeMenu}
            className="group flex h-14 w-full shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-zinc-100 px-4 text-left transition-colors hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            {brand}
            <span className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-50">
              <Icon d="M15 18l-6-6 6-6" className="h-4 w-4" />
            </span>
          </button>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.links.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                            active
                              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-50"
                              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                          }`}
                        >
                          <Icon
                            d={ICON_PATHS[link.icon]}
                            className={`h-4 w-4 shrink-0 ${active ? "" : "opacity-70"}`}
                          />
                          <span className="min-w-0 flex-1 truncate">{link.label}</span>
                          <LinkPendingHint />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="shrink-0 space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={switchLanguage}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold uppercase text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                title={labels.language}
              >
                {otherLocale}
              </button>
              <ThemeToggle labels={labels.theme} />
              <Link
                href={`/${lang}`}
                className="ml-auto text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {labels.backToSite} ↗
              </Link>
            </div>
            <AdminNotificationStatus
              permission={permission}
              labels={labels.notifications}
              lang={lang}
              onClick={showBanner}
            />
            <div className="flex items-center gap-2.5 rounded-md px-1 py-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-xs font-semibold text-white">
                {adminName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {adminName}
              </span>
              <form action={logout} onSubmit={announceAdminLogout}>
                <input type="hidden" name="lang" value={lang} />
                <button
                  type="submit"
                  title={labels.logout}
                  aria-label={labels.logout}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {rightPanel}

      <div
        className={`transition-[padding] duration-300 ease-panel motion-reduce:transition-none ${
          navOpen ? "lg:pl-72" : ""
        } ${rightPanelOpen ? "lg:pr-72" : ""}`}
      >
        <main
          aria-busy={refreshing || undefined}
          className={`mx-auto w-full px-4 py-6 transition-opacity duration-200 sm:px-6 ${
            refreshing ? "opacity-60" : ""
          } ${
            wideMain
              ? "flex min-h-[calc(100dvh-3.5rem)] flex-col lg:px-6"
              : "max-w-7xl lg:px-8"
          }`}
        >
          {dismissed !== permission && (
            <AdminNotificationBanner
              permission={permission}
              labels={labels.notifications}
              lang={lang}
              onDismiss={dismissBanner}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
