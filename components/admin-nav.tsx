import Link from "next/link";
import { logout } from "@/lib/actions";
import { hasPermission, isSuperAdmin } from "@/lib/auth";
import { features } from "@/lib/features";
import type { Admin } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";

export function AdminNav({
  dict,
  lang,
  admin,
}: {
  dict: Dict;
  lang: Locale;
  admin: Admin;
}) {
  const links: { href: string; label: string; show: boolean }[] = [
    { href: `/${lang}/admin`, label: dict.nav.dashboard, show: true },
    {
      href: `/${lang}/admin/tickets`,
      label: dict.admin.tickets.title,
      show:
        (hasPermission(admin, "it") && features.itTicketsEnabled) ||
        (hasPermission(admin, "maintenance") &&
          features.maintenanceTicketsEnabled),
    },
    {
      href: `/${lang}/admin/complaints`,
      label: dict.admin.complaints.title,
      show: hasPermission(admin, "complaints") && features.complaintsEnabled,
    },
    {
      href: `/${lang}/admin/places`,
      label: dict.admin.places.title,
      show: isSuperAdmin(admin),
    },
    {
      href: `/${lang}/admin/users`,
      label: dict.admin.users.title,
      show: isSuperAdmin(admin),
    },
    {
      href: `/${lang}/admin/settings`,
      label: dict.admin.settings.title,
      show: isSuperAdmin(admin),
    },
  ];

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-1">
        {links
          .filter((l) => l.show)
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {admin.name}
        </span>
        <form action={logout}>
          <input type="hidden" name="lang" value={lang} />
          <button
            type="submit"
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            {dict.nav.logout}
          </button>
        </form>
      </div>
    </nav>
  );
}
