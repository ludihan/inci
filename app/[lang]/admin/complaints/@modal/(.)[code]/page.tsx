import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { getComplaintByCode } from "@/lib/store";
import { Modal } from "@/components/modal";
import { ComplaintDetailPanel } from "@/components/complaint-detail-panel";

export default async function AdminComplaintModal({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const { code } = await params;
  const complaint = await getComplaintByCode(code);

  if (!complaint) {
    return (
      <Modal title={code} closeLabel={dict.common.close}>
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.common.notFound}
        </p>
      </Modal>
    );
  }

  if (!isSuperAdmin(admin) && complaint.assignedToId !== admin.id) {
    return (
      <Modal title={code} closeLabel={dict.common.close}>
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.admin.denied}
        </p>
      </Modal>
    );
  }

  return (
    <Modal title={complaint.code} closeLabel={dict.common.close}>
      <ComplaintDetailPanel
        complaint={complaint}
        admin={admin}
        dict={dict}
        locale={locale}
      />
    </Modal>
  );
}
