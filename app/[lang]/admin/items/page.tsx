import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { listItems } from "@/lib/store";
import { AdminItemsManager } from "@/components/admin-items";

export default async function AdminItemsPage() {
  const dict = await getDict();
  const locale = await getLocale();
  const current = await getCurrentAdmin();

  if (!current) {
    redirect(`/${locale}/admin/login`);
  }

  if (!isSuperAdmin(current)) {
    redirect(`/${locale}/admin`);
  }

  const items = await listItems();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.admin.items.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.items.subtitle}
        </p>
      </div>

      <AdminItemsManager items={items} dict={dict} lang={locale} />
    </div>
  );
}
