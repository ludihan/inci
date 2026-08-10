import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, hasPermission } from "@/lib/auth";
import { getComplaintByCode } from "@/lib/store";
import { StatusBadge } from "@/components/badges";
import { AdminComplaintReplyForm } from "@/components/admin-complaint-reply-form";
import { ComplaintStatusForm } from "@/components/complaint-status-form";

export default async function AdminComplaintDetailPage({
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

  if (!hasPermission(admin, "complaints")) {
    redirect(`/${locale}/admin`);
  }

  const { code } = await params;
  const complaint = await getComplaintByCode(code);

  if (!complaint) {
    return (
      <p className="py-16 text-center text-zinc-500 dark:text-zinc-400">
        {dict.common.notFound}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/${locale}/admin/complaints`}
        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {dict.common.back}
      </Link>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-wider text-zinc-900 dark:text-zinc-50">
                {complaint.code}
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {dict.common.anonymous} · {complaint.createdAt.slice(0, 10)}
              </p>
            </div>
            <StatusBadge status={complaint.status} dict={dict} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {complaint.subject}
          </h2>
          {complaint.place && (
            <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {dict.complaint.fields.place}: {complaint.place.name}
            </p>
          )}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-800 dark:text-zinc-200">
            {complaint.content}
          </p>
          {complaint.photoPath && (
            <a
              href={complaint.photoPath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block"
            >
              <img
                src={complaint.photoPath}
                alt={dict.complaint.fields.photo}
                loading="lazy"
                className="max-h-72 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              />
            </a>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.complaint.responses}
          </h2>
          {complaint.responses.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {dict.complaint.noResponses}
            </p>
          ) : (
            <ol className="space-y-4">
              {complaint.responses.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {r.sender === "admin"
                      ? (r.senderName ?? dict.common.admin)
                      : dict.complaint.anonymous}{" "}
                    · {r.createdAt.slice(0, 10)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                    {r.content}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.admin.complaints.title}
          </h2>
          <AdminComplaintReplyForm
            dict={dict}
            lang={locale}
            code={complaint.code}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ComplaintStatusForm
            dict={dict}
            lang={locale}
            code={complaint.code}
            status={complaint.status}
          />
        </div>
      </div>
    </div>
  );
}
