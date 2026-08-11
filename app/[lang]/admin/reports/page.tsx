import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, isSuperAdmin } from "@/lib/auth";
import { features } from "@/lib/features";
import { listPlaces, hasAssignedComplaints } from "@/lib/store";
import { ReportBuilder } from "@/components/report-builder";

export default async function AdminReportsPage() {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const canIT = hasPermission(admin, "it") && features.itTicketsEnabled;
  const canMaintenance =
    hasPermission(admin, "maintenance") && features.maintenanceTicketsEnabled;
  const canViewComplaints =
    features.complaintsEnabled &&
    (isSuperAdmin(admin) || (await hasAssignedComplaints(admin.id)));

  if (!canIT && !canMaintenance && !canViewComplaints) {
    redirect(`/${locale}/admin`);
  }

  const places = await listPlaces();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.report.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.report.subtitle}
        </p>
      </div>

      <ReportBuilder
        dict={dict}
        lang={locale}
        places={places}
        canIT={canIT}
        canMaintenance={canMaintenance}
        canComplaints={canViewComplaints}
      />
    </div>
  );
}
