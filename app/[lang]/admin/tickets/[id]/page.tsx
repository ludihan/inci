import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n";
import { ticketsUrlOpening } from "@/lib/utils";

// Ticket details only exist as the panel intercepted on client-side
// navigation from the list. Anything that reaches this page instead — a
// reload with the panel open, a link opened in a new tab, a link from
// another admin page (the dashboard, items) — goes to the list, which then
// opens the panel (see AdminLiveUpdates).
export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  // `id` arrives still percent-encoded, as it was in the URL.
  const { id } = await params;
  redirect(ticketsUrlOpening(`/${locale}/admin/tickets/${id}`));
}
