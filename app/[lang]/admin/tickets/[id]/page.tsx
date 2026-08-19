import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n";

export default async function AdminTicketDetailPage() {
  const locale = await getLocale();
  redirect(`/${locale}/admin/tickets`);
}
