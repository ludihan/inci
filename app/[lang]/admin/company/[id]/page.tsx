import { notFound, redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { getCompanyById } from "@/lib/store";
import { AdminCompanyForm } from "@/components/admin-company-form";

export const dynamic = "force-dynamic";

export default async function AdminCompanyEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const dict = await getDict();
  const locale = await getLocale();
  const current = await getCurrentAdmin();

  if (!current) {
    redirect(`/${locale}/admin/login`);
  }
  if (!isSuperAdmin(current)) {
    redirect(`/${locale}/admin`);
  }

  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  const { saved } = await searchParams;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {company.name || dict.admin.company.unnamedCompany}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dict.admin.company.subtitle}
        </p>
      </div>

      <AdminCompanyForm
        company={company}
        dict={dict}
        lang={locale}
        saved={saved === "1"}
      />
    </div>
  );
}
