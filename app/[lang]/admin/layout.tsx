import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { hasAssignedComplaints } from "@/lib/store";
import { AdminNav } from "@/components/admin-nav";
import { AdminLiveUpdates } from "@/components/admin-live-updates";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  const canViewComplaints = admin
    ? isSuperAdmin(admin) || (await hasAssignedComplaints(admin.id))
    : false;

  return (
    <div className="mx-auto max-w-5xl">
      {admin && (
        <>
          <AdminNav
            dict={dict}
            lang={locale}
            admin={admin}
            canViewComplaints={canViewComplaints}
          />
          <AdminLiveUpdates />
        </>
      )}
      <main className="py-8">{children}</main>
    </div>
  );
}
