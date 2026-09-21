import Link from "next/link";
import { logout } from "@/lib/actions";
import { hasPermission, isSuperAdmin } from "@/lib/auth";
import { features } from "@/lib/features";
import type { Admin } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminNav({
  dict,
  lang,
  admin,
  canViewComplaints,
}: {
  dict: Dict;
  lang: Locale;
  admin: Admin;
  canViewComplaints: boolean;
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
      show: canViewComplaints && features.complaintsEnabled,
    },
    {
      href: `/${lang}/admin/reports`,
      label: dict.report.title,
      show:
        canViewComplaints ||
        (hasPermission(admin, "it") && features.itTicketsEnabled) ||
        (hasPermission(admin, "maintenance") &&
          features.maintenanceTicketsEnabled),
    },
    {
      href: `/${lang}/admin/units`,
      label: dict.admin.units.title,
      show: isSuperAdmin(admin),
    },
    {
      href: `/${lang}/admin/areas`,
      label: dict.admin.areas.title,
      show: isSuperAdmin(admin),
    },
    {
      href: `/${lang}/admin/items`,
      label: dict.admin.items.title,
      show: isSuperAdmin(admin),
    },
    {
      href: `/${lang}/admin/service-types`,
      label: dict.admin.serviceTypes.title,
      show: isSuperAdmin(admin),
    },
    {
      href: `/${lang}/admin/company`,
      label: dict.admin.company.title,
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
    {
      href: `/${lang}/admin/sql`,
      label: dict.admin.sql.title,
      show: isSuperAdmin(admin),
    },
  ];

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-1 py-2.5 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-0.5">
        {links
          .filter((l) => l.show)
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle labels={dict.nav.theme} />
        <span className="hidden text-sm font-medium text-zinc-500 sm:inline dark:text-zinc-400">
          {admin.name}
        </span>
        <form action={logout}>
          <input type="hidden" name="lang" value={lang} />
          <button
            type="submit"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            {dict.nav.logout}
          </button>
        </form>
      </div>
    </nav>
  );
}
