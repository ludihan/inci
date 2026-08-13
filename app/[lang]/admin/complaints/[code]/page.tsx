import { redirect } from "next/navigation";
import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { getCurrentAdmin, isSuperAdmin } from "@/lib/auth";
import { getComplaintByCode, listAdmins } from "@/lib/store";
import { AttachmentGallery } from "@/components/attachment-gallery";
import {
  assumeComplaint,
  forwardComplaint,
  releaseComplaint,
} from "@/lib/actions";
import { StatusBadge } from "@/components/badges";
import { ComplaintResponses } from "@/components/complaint-responses";
import { CopyButton } from "@/components/copy-button";
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

  const { code } = await params;
  const complaint = await getComplaintByCode(code);

  if (!complaint) {
    return (
      <p className="py-16 text-center text-zinc-500 dark:text-zinc-400">
        {dict.common.notFound}
      </p>
    );
  }

  if (!isSuperAdmin(admin) && complaint.assignedToId !== admin.id) {
    redirect(`/${locale}/admin`);
  }

  const isSuper = isSuperAdmin(admin);
  const admins = isSuper ? await listAdmins() : [];

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
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-2xl font-bold tracking-wider text-zinc-900 dark:text-zinc-50">
                  {complaint.code}
                </h1>
                <CopyButton value={complaint.code} dict={dict} />
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {dict.common.anonymous} · {complaint.createdAt.slice(0, 10)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={complaint.status} dict={dict} />
              <a
                href={`/api/reports?module=complaints&ids=${encodeURIComponent(complaint.code)}&lang=${locale}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {dict.report.generate}
              </a>
            </div>
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
          {complaint.attachments.length > 0 && (
            <AttachmentGallery
              attachments={complaint.attachments}
              dict={dict}
              alt={dict.complaint.fields.photo}
            />
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.admin.assignedTo}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {complaint.assignedToName ?? dict.admin.unassigned}
          </p>

          {isSuper && (
            <div className="mt-4 space-y-4">
              {complaint.assignedToId !== admin.id && (
                <form action={assumeComplaint}>
                  <input type="hidden" name="lang" value={locale} />
                  <input type="hidden" name="code" value={complaint.code} />
                  <button
                    type="submit"
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 bg-zinc-900"
                  >
                    {dict.admin.assume}
                  </button>
                </form>
              )}

              <form action={forwardComplaint} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="lang" value={locale} />
                <input type="hidden" name="code" value={complaint.code} />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`forward-${complaint.code}`}
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {dict.admin.forwardTo}
                  </label>
                  <select
                    id={`forward-${complaint.code}`}
                    name="adminId"
                    required
                    className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {admins
                      .filter((a) => a.id !== admin.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {dict.admin.forward}
                </button>
              </form>
            </div>
          )}

          {complaint.assignedToId === admin.id && (
            <form action={releaseComplaint} className="mt-4">
              <input type="hidden" name="lang" value={locale} />
              <input type="hidden" name="code" value={complaint.code} />
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                {dict.admin.release}
              </button>
            </form>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {dict.complaint.responses}
          </h2>
          <ComplaintResponses complaint={complaint} dict={dict} locale={locale} />
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
