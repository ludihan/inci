import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission, moduleForTicketType } from "@/lib/auth";
import { getTicketById, listItems, listServiceTypes } from "@/lib/store";
import { TicketDrawer } from "@/components/ticket-drawer";
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
  const [catalog, serviceCatalog] = await Promise.all([
    listItems(),
    listServiceTypes(),
  ]);

  if (!ticket) {
    return (
      <TicketDrawer title={id} closeLabel={dict.common.close} backLabel={dict.common.back}>
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.common.notFound}
        </p>
      </TicketDrawer>
    );
  }

  if (!hasPermission(admin, moduleForTicketType(ticket.type))) {
    return (
      <TicketDrawer title={id} closeLabel={dict.common.close} backLabel={dict.common.back}>
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {dict.admin.denied}
        </p>
      </TicketDrawer>
    );
  }

  return (
    <TicketDrawer title={ticket.id} closeLabel={dict.common.close} backLabel={dict.common.back}>
      <TicketDetailPanel
        ticket={ticket}
        admin={admin}
        dict={dict}
        locale={locale}
        catalog={catalog}
        serviceCatalog={serviceCatalog}
      />
    </TicketDrawer>
  );
}
