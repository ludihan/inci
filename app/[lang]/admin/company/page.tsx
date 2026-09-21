import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { listCompanies } from "@/lib/store";
import { deleteCompany } from "@/lib/actions";
import { DeleteButton } from "@/components/delete-button";

export const dynamic = "force-dynamic";

export default async function AdminCompanyPage({
  searchParams,
}: {
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

  const c = dict.admin.company;
  const companies = await listCompanies();
  const { saved } = await searchParams;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {c.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {c.subtitle}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/company/new`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {c.create}
        </Link>
      </div>

      {saved === "1" && (
        <p className="mb-6 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {c.saved}
        </p>
      )}

      {companies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {c.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {companies.map((company) => (
            <li
              key={company.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {company.name || c.unnamedCompany}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {c.unitCount}: {company.unitCount ?? 0}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/${locale}/admin/company/${company.id}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {c.edit}
                </Link>
                <form action={deleteCompany}>
                  <input type="hidden" name="lang" value={locale} />
                  <input type="hidden" name="id" value={company.id} />
                  <DeleteButton confirmMessage={c.deleteConfirm}>
                    {c.delete}
                  </DeleteButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
