import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { listPlaces } from "@/lib/store";
import { AdminPlacesManager } from "@/components/admin-places";

export default async function AdminPlacesPage() {
  const dict = await getDict();
  const locale = await getLocale();
  const current = await getCurrentAdmin();

  if (!current) {
    redirect(`/${locale}/admin/login`);
  }

  if (!isSuperAdmin(current)) {
    redirect(`/${locale}/admin`);
  }

  const places = await listPlaces();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.admin.places.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.places.subtitle}
        </p>
      </div>

      <AdminPlacesManager places={places} dict={dict} lang={locale} />
    </div>
  );
}
