import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { features } from "@/lib/features";
import { getDB } from "@/lib/store";
import { ComplaintCard } from "@/components/complaint-card";

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  if (!features.complaintsEnabled) {
    redirect(`/${locale}/admin`);
  }

  if (!hasPermission(admin, "complaints")) {
    redirect(`/${locale}/admin`);
  }

  const { status } = await searchParams;
  const statusFilter = status === "open" || status === "closed" ? status : undefined;

  const db = await getDB();
  const complaints = db.complaints
    .filter((c) => (statusFilter ? c.status === statusFilter : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const pillClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    }`;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {dict.admin.complaints.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {dict.admin.complaints.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/${locale}/admin/complaints`} className={pillClass(!statusFilter)}>
            {dict.admin.dashboard.totalComplaints}
          </a>
          <a
            href={`/${locale}/admin/complaints?status=open`}
            className={pillClass(statusFilter === "open")}
          >
            {dict.admin.dashboard.openComplaints}
          </a>
          <a
            href={`/${locale}/admin/complaints?status=closed`}
            className={pillClass(statusFilter === "closed")}
          >
            {dict.admin.dashboard.closedComplaints}
          </a>
        </div>
      </div>

      {complaints.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {dict.complaint.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              dict={dict}
              href={`/${locale}/admin/complaints/${encodeURIComponent(c.code)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
