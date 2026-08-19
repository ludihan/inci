import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n";

export default async function AdminComplaintDetailPage() {
  const locale = await getLocale();
  redirect(`/${locale}/admin/complaints`);
}
