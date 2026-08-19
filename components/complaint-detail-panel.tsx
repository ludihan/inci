import type { Admin, Complaint } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { assumeComplaint, forwardComplaint, releaseComplaint } from "@/lib/actions";
import { listAdmins } from "@/lib/store";
import { isSuperAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/badges";
import { ComplaintResponses } from "@/components/complaint-responses";
import { CopyButton } from "@/components/copy-button";
import { AttachmentGallery } from "@/components/attachment-gallery";
import { AdminComplaintReplyForm } from "@/components/admin-complaint-reply-form";
import { ComplaintStatusForm } from "@/components/complaint-status-form";

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

export async function ComplaintDetailPanel({
  complaint,
  admin,
  dict,
  locale,
}: {
  complaint: Complaint;
  admin: Admin;
  dict: Dict;
  locale: Locale;
}) {
  const isSuper = isSuperAdmin(admin);
  const admins = isSuper ? await listAdmins() : [];

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold tracking-wider text-zinc-900 dark:text-zinc-50">
                {complaint.code}
              </h1>
              <CopyButton value={complaint.code} dict={dict} stopPropagation />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              {dict.common.anonymous} · {complaint.createdAt.slice(0, 10)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={complaint.status} dict={dict} />
            <a
              href={`/api/reports?module=complaints&ids=${encodeURIComponent(complaint.code)}&lang=${locale}`}
              target="_blank"
              title={dict.report.generate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            </a>
          </div>
        </div>

        <h2 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
          {complaint.subject}
        </h2>
        {complaint.place && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {dict.admin.assignedTo}:{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {complaint.assignedToName ?? dict.admin.unassigned}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {isSuper && complaint.assignedToId !== admin.id && (
              <form action={assumeComplaint}>
                <input type="hidden" name="lang" value={locale} />
                <input type="hidden" name="code" value={complaint.code} />
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {dict.admin.assume}
                </button>
              </form>
            )}
            {complaint.assignedToId === admin.id && (
              <form action={releaseComplaint}>
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
        </div>

        {isSuper && (
          <form
            action={forwardComplaint}
            className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800"
          >
            <input type="hidden" name="lang" value={locale} />
            <input type="hidden" name="code" value={complaint.code} />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`forward-${complaint.code}`}
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
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
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {dict.complaint.responses}
        </h2>
        <div className="max-h-72 overflow-y-auto py-1 pr-1 pl-3">
          <ComplaintResponses complaint={complaint} dict={dict} locale={locale} />
        </div>
      </div>

      <div className={cardClass}>
        <AdminComplaintReplyForm dict={dict} lang={locale} code={complaint.code} />
      </div>

      <div className={cardClass}>
        <ComplaintStatusForm
          dict={dict}
          lang={locale}
          code={complaint.code}
          status={complaint.status}
        />
      </div>
    </div>
  );
}
