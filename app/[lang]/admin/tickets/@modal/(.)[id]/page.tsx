import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, moduleForTicketType } from "@/lib/auth";
import { getTicketById } from "@/lib/store";
import { Modal } from "@/components/modal";
import { TicketDetailPanel } from "@/components/ticket-detail-panel";

export default async function AdminTicketModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`/${locale}/admin/login`);
  }

  const { id } = await params;
  const ticket = await getTicketById(id);

  if (!ticket) {
    return (
      <Modal title={id} closeLabel={dict.common.close}>
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.common.notFound}
        </p>
      </Modal>
    );
  }

  if (!hasPermission(admin, moduleForTicketType(ticket.type))) {
    return (
      <Modal title={id} closeLabel={dict.common.close}>
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.admin.denied}
        </p>
      </Modal>
    );
  }

  return (
    <Modal title={ticket.id} closeLabel={dict.common.close}>
      <TicketDetailPanel
        ticket={ticket}
        admin={admin}
        dict={dict}
        locale={locale}
      />
    </Modal>
  );
}
