import { cookies } from "next/headers";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";
import { features } from "@/lib/features";
import { FILTERS_PANEL_COOKIE, NAV_COOKIE } from "@/lib/admin-panels";
import { loadAdminFilters } from "@/lib/admin-filters-server";
import { getSettings, hasAssignedComplaints } from "@/lib/store";
import { AdminNav, type AdminNavGroup } from "@/components/admin-nav";
import {
  AdminFiltersProvider,
  FilterPanel,
  FilterPanelHeader,
  FilterPanelToggle,
} from "@/components/admin-filters";
import { AdminLiveUpdates } from "@/components/admin-live-updates";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  // Logged-out visitors only ever see the login page, which has no shell.
  if (!admin) return <div className="mx-auto max-w-5xl py-8">{children}</div>;

  const [settings, assignedComplaints, cookieStore, { filters, options }] =
    await Promise.all([
      getSettings(),
      hasAssignedComplaints(admin.id),
      cookies(),
      loadAdminFilters(admin),
    ]);

  const canViewComplaints = isSuperAdmin(admin) || assignedComplaints;
  const canTickets =
    (hasPermission(admin, "it") && features.itTicketsEnabled) ||
    (hasPermission(admin, "maintenance") &&
      features.maintenanceTicketsEnabled);
  const canComplaints = canViewComplaints && features.complaintsEnabled;
  const superAdmin = isSuperAdmin(admin);
  const base = `/${locale}/admin`;

  const groups: AdminNavGroup[] = [
    {
      label: dict.admin.sidebar.overview,
      links: [{ href: base, label: dict.nav.dashboard, icon: "dashboard" as const }],
    },
    {
      label: dict.admin.sidebar.support,
      links: [
        ...(canTickets
          ? [
              {
                href: `${base}/tickets`,
                label: dict.admin.tickets.title,
                icon: "tickets" as const,
              },
            ]
          : []),
        ...(canComplaints
          ? [
              {
                href: `${base}/complaints`,
                label: dict.admin.complaints.title,
                icon: "complaints" as const,
              },
            ]
          : []),
        ...(canViewComplaints || canTickets
          ? [
              {
                href: `${base}/reports`,
                label: dict.report.title,
                icon: "reports" as const,
              },
            ]
          : []),
      ],
    },
    ...(superAdmin
      ? [
          {
            label: dict.admin.sidebar.management,
            links: [
              { href: `${base}/units`, label: dict.admin.units.title, icon: "units" as const },
              { href: `${base}/areas`, label: dict.admin.areas.title, icon: "areas" as const },
              { href: `${base}/items`, label: dict.admin.items.title, icon: "items" as const },
              {
                href: `${base}/service-types`,
                label: dict.admin.serviceTypes.title,
                icon: "serviceTypes" as const,
              },
              { href: `${base}/company`, label: dict.admin.company.title, icon: "company" as const },
            ],
          },
          {
            label: dict.admin.sidebar.system,
            links: [
              { href: `${base}/users`, label: dict.admin.users.title, icon: "users" as const },
              { href: `${base}/settings`, label: dict.admin.settings.title, icon: "settings" as const },
              { href: `${base}/sql`, label: dict.admin.sql.title, icon: "sql" as const },
            ],
          },
        ]
      : []),
  ].filter((g) => g.links.length > 0);

  const initialNavOpen = cookieStore.get(NAV_COOKIE)?.value !== "closed";
  const initialFiltersOpen =
    cookieStore.get(FILTERS_PANEL_COOKIE)?.value !== "closed";

  const fp = dict.admin.filterPanel;

  return (
    <AdminFiltersProvider
      initialFilters={filters}
      options={options}
      initialOpen={initialFiltersOpen}
      labels={{
        title: fp.title,
        hint: fp.hint,
        open: fp.open,
        collapse: fp.collapse,
        close: fp.close,
        clear: fp.clear,
        clearAll: fp.clearAll,
        clearOne: fp.clearOne,
        clearMany: fp.clearMany,
        noneActive: fp.noneActive,
        inUse: fp.inUse,
        period: fp.period,
        from: fp.from,
        to: fp.to,
        presets: fp.presets,
        status: fp.status,
        statuses: {
          open: dict.common.open,
          in_progress: dict.common.inProgress,
          closed: dict.common.closed,
        },
        deadline: fp.deadline,
        deadlines: fp.deadlines,
        criticality: fp.criticality,
        criticalities: dict.ticket.criticality,
        type: fp.type,
        types: {
          it: dict.ticket.fields.it,
          maintenance: dict.ticket.fields.maintenance,
        },
        unit: fp.unit,
        area: fp.area,
        assignee: fp.assignee,
        all: fp.all,
        unassigned: fp.unassigned,
      }}
    >
      <AdminNav
        lang={locale}
        adminName={admin.name}
        logo={settings.logoPath}
        groups={groups}
        initialNavOpen={initialNavOpen}
        topBarActions={<FilterPanelToggle />}
        topBarRight={<FilterPanelHeader />}
        rightPanel={<FilterPanel />}
        labels={{
          appName: dict.appName,
          logout: dict.nav.logout,
          language: dict.nav.language,
          theme: dict.nav.theme,
          openMenu: dict.admin.sidebar.openMenu,
          closeMenu: dict.admin.sidebar.closeMenu,
          collapseMenu: fp.collapseMenu,
          backToSite: dict.admin.sidebar.backToSite,
          notifications: dict.admin.notifications,
        }}
      >
        <AdminLiveUpdates
          lang={locale}
          labels={{
            notifications: dict.admin.notifications,
            ticketTypes: {
              it: dict.ticket.fields.it,
              maintenance: dict.ticket.fields.maintenance,
            },
            criticality: dict.ticket.criticality,
          }}
        />
        {children}
      </AdminNav>
    </AdminFiltersProvider>
  );
}
