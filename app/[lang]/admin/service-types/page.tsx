import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { listServiceTypes } from "@/lib/store";
import { AdminServiceTypesManager } from "@/components/admin-service-types";

export default async function AdminServiceTypesPage() {
  const dict = await getDict();
  const locale = await getLocale();
  const current = await getCurrentAdmin();

  if (!current) {
    redirect(`/${locale}/admin/login`);
  }
  if (!isSuperAdmin(current)) {
    redirect(`/${locale}/admin`);
  }

  const serviceTypes = await listServiceTypes();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.admin.serviceTypes.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.serviceTypes.subtitle}
        </p>
      </div>

      <AdminServiceTypesManager
        serviceTypes={serviceTypes}
        dict={dict}
        lang={locale}
      />
    </div>
  );
}
