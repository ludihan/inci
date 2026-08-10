"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";

export function Nav({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const otherLocale: Locale = lang === "pt" ? "en" : "pt";

  const links = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/new/ticket`, label: dict.nav.openTicket },
    { href: `/${lang}/new/complaint`, label: dict.nav.sendComplaint },
    { href: `/${lang}/track`, label: dict.nav.track },
    { href: `/${lang}/admin`, label: dict.nav.admin },
  ];

  const isActive = (href: string) => {
    if (href === `/${lang}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  function switchLanguage() {
    const segments = pathname.split("/");
    if (segments[1] === "pt" || segments[1] === "en") {
      segments[1] = otherLocale;
      router.push(segments.join("/") || `/${otherLocale}`);
    } else {
      router.push(`/${otherLocale}`);
    }
  }

  const linkClass = (href: string) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive(href)
        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:text-zinc-50 dark:hover:bg-zinc-900"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900">
            {dict.appName.charAt(0)}
          </span>
          {dict.appName}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={switchLanguage}
            className="ml-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold uppercase text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            title={dict.nav.language}
          >
            {otherLocale}
          </button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={switchLanguage}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            title={dict.nav.language}
          >
            {otherLocale}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-zinc-200 p-2 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h16M4 12h16M4 17h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-zinc-200 px-4 pb-4 pt-2 md:hidden dark:border-zinc-800">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`${linkClass(link.href)} py-2.5`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
