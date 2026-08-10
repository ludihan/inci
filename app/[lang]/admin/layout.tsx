import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  return (
    <div className="mx-auto max-w-5xl">
      {admin && <AdminNav dict={dict} lang={locale} admin={admin} />}
      <main className="py-8">{children}</main>
    </div>
  );
}
