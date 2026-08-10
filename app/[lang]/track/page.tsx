import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { features } from "@/lib/features";

export default async function TrackPage() {
  const dict = await getDict();
  const locale = await getLocale();

  const options = [
    {
      href: `/${locale}/track/ticket`,
      title: dict.home.trackTitle,
      desc: dict.home.trackDesc,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    ...(features.complaintsEnabled
      ? [
          {
            href: `/${locale}/track/complaint`,
            title: dict.home.trackComplaintTitle,
            desc: dict.home.trackComplaintDesc,
            icon: (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {dict.nav.track}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          {dict.ticket.trackSubtitle} · {dict.complaint.trackSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white dark:bg-zinc-800 dark:text-zinc-100 dark:group-hover:bg-zinc-50 dark:group-hover:text-zinc-900">
              {option.icon}
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {option.title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {option.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
