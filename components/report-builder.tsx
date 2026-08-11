"use client";

import type { Place } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";

export function ReportBuilder({
  dict,
  lang,
  places,
  canIT,
  canMaintenance,
  canComplaints,
}: {
  dict: Dict;
  lang: Locale;
  places: Place[];
  canIT: boolean;
  canMaintenance: boolean;
  canComplaints: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {canIT || canMaintenance ? (
        <ReportPanel
          key="tickets"
          dict={dict}
          lang={lang}
          places={places}
          module="tickets"
          title={dict.report.ticketsTitle}
          showType={canIT && canMaintenance}
        />
      ) : null}
      {canComplaints ? (
        <ReportPanel
          key="complaints"
          dict={dict}
          lang={lang}
          places={places}
          module="complaints"
          title={dict.report.complaintsTitle}
          showType={false}
        />
      ) : null}
    </div>
  );
}

function ReportPanel({
  dict,
  lang,
  places,
  module,
  title,
  showType,
}: {
  dict: Dict;
  lang: Locale;
  places: Place[];
  module: "tickets" | "complaints";
  title: string;
  showType: boolean;
}) {
  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";
  const fieldClass = "min-w-0";

  const sections: { key: string; label: string; checked: boolean; help?: string }[] =
    [
      { key: "summary", label: dict.report.summary, checked: true },
      { key: "details", label: dict.report.details, checked: true },
      { key: "history", label: dict.report.history, checked: true },
      {
        key: "photos",
        label: dict.report.photos,
        checked: false,
        help: dict.report.photosHelp,
      },
      { key: "assignee", label: dict.report.assignee, checked: true },
      { key: "requester", label: dict.report.requester, checked: module === "tickets" },
    ];

  return (
    <form
      action="/api/reports"
      method="get"
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="lang" value={lang} />

      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {dict.report.filtersTitle}
        </h3>

        <div className={fieldClass}>
          <label htmlFor={`${module}-title`} className={labelClass}>
            {dict.report.titleField}
          </label>
          <input
            id={`${module}-title`}
            name="title"
            type="text"
            placeholder={dict.report.titlePlaceholder}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor={`${module}-status`} className={labelClass}>
              {dict.report.statusLabel}
            </label>
            <select
              id={`${module}-status`}
              name="status"
              defaultValue=""
              className={inputClass}
            >
              <option value="">{dict.report.statusAll}</option>
              <option value="open">{dict.common.open}</option>
              <option value="closed">
                {module === "tickets" ? dict.common.closed : dict.complaint.closed}
              </option>
            </select>
          </div>

          {showType && (
            <div className={fieldClass}>
              <label htmlFor={`${module}-type`} className={labelClass}>
                {dict.report.typeLabel}
              </label>
              <select
                id={`${module}-type`}
                name="type"
                defaultValue=""
                className={inputClass}
              >
                <option value="">{dict.report.typeAll}</option>
                <option value="it">{dict.ticket.fields.it}</option>
                <option value="maintenance">{dict.ticket.fields.maintenance}</option>
              </select>
            </div>
          )}

          <div className={fieldClass}>
            <label htmlFor={`${module}-from`} className={labelClass}>
              {dict.report.from}
            </label>
            <input
              id={`${module}-from`}
              name="from"
              type="date"
              className={inputClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor={`${module}-to`} className={labelClass}>
              {dict.report.to}
            </label>
            <input
              id={`${module}-to`}
              name="to"
              type="date"
              className={inputClass}
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor={`${module}-place`} className={labelClass}>
              {dict.report.placeLabel}
            </label>
            <select
              id={`${module}-place`}
              name="placeId"
              defaultValue=""
              className={inputClass}
            >
              <option value="">{dict.report.placeAll}</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {dict.report.sectionsTitle}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sections.map((section) => (
              <label
                key={section.key}
                className="flex items-start gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <input
                  type="checkbox"
                  name="sections"
                  value={section.key}
                  defaultChecked={section.checked}
                  className="mt-0.5 h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {section.label}
                  </span>
                  {section.help && (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {section.help}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {dict.report.generate}
      </button>
    </form>
  );
}
