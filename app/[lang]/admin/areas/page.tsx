import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { listAreas } from "@/lib/store";
import { AdminAreasManager } from "@/components/admin-areas";

export default async function AdminAreasPage() {
  const dict = await getDict();
  const locale = await getLocale();
  const current = await getCurrentAdmin();

  if (!current) {
    redirect(`/${locale}/admin/login`);
  }
  if (!isSuperAdmin(current)) {
    redirect(`/${locale}/admin`);
  }

  const areas = await listAreas();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.admin.areas.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.areas.subtitle}
        </p>
      </div>

      <AdminAreasManager areas={areas} dict={dict} lang={locale} />
    </div>
  );
}
