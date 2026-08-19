"use client";

import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { Ticket, TicketStatus } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatCpf, formatDateTime } from "@/lib/utils";
import { StatusBadge, TicketTypeBadge } from "./badges";
import { CopyButton } from "./copy-button";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const ROW_STATUS_CLASS: Record<TicketStatus, string> = {
  open: "bg-red-100 hover:bg-red-200/70 dark:bg-red-950/50 dark:hover:bg-red-950/80",
  in_progress:
    "bg-orange-100 hover:bg-orange-200/70 dark:bg-orange-950/50 dark:hover:bg-orange-950/80",
  closed: "bg-blue-100 hover:bg-blue-200/70 dark:bg-blue-950/40 dark:hover:bg-blue-950/70",
};

const LEGEND_SWATCH: Record<TicketStatus, string> = {
  open: "bg-red-200 dark:bg-red-900",
  in_progress: "bg-orange-200 dark:bg-orange-900",
  closed: "bg-blue-200 dark:bg-blue-900",
};

const helper = createColumnHelper<typeof features, Ticket>();

function TruncatedCell({
  value,
  className = "max-w-[160px]",
}: {
  value: string;
  className?: string;
}) {
  if (!value) return <span className="text-zinc-500 dark:text-zinc-500">—</span>;
  return (
    <span
      className={`block truncate text-zinc-700 dark:text-zinc-300 ${className}`}
      title={value}
    >
      {value}
    </span>
  );
}

export function TicketsTable({
  tickets,
  dict,
  locale,
}: {
  tickets: Ticket[];
  dict: Dict;
  locale: Locale;
}) {
  const router = useRouter();

  const columns = helper.columns([
    helper.accessor("status", {
      header: dict.admin.table.status,
      cell: (ctx) => <StatusBadge status={ctx.getValue()} dict={dict} />,
    }),
    helper.accessor("type", {
      header: dict.admin.table.type,
      cell: (ctx) => <TicketTypeBadge type={ctx.getValue()} dict={dict} />,
    }),
    helper.accessor("id", {
      header: dict.admin.table.code,
      cell: (ctx) => (
        <span
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100"
        >
          {ctx.getValue()}
          <CopyButton value={ctx.getValue()} dict={dict} stopPropagation />
        </span>
      ),
    }),
    helper.accessor("createdAt", {
      header: dict.admin.table.createdAt,
      cell: (ctx) => (
        <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">
          {formatDateTime(ctx.getValue(), locale)}
        </span>
      ),
    }),
    helper.accessor((t) => t.assignedToName ?? "", {
      id: "assignee",
      header: dict.admin.table.assignedTo,
      cell: (ctx) => {
        const t = ctx.row.original;
        if (!t.assignedToName) {
          return t.status !== "closed" ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {dict.admin.unassigned}
            </span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-500">—</span>
          );
        }
        return <TruncatedCell value={t.assignedToName} className="max-w-[140px]" />;
      },
    }),
    helper.accessor((t) => t.place?.name ?? "", {
      id: "place",
      header: dict.admin.table.place,
      cell: (ctx) => <TruncatedCell value={ctx.getValue()} />,
    }),
    helper.accessor("subject", {
      header: dict.admin.table.subject,
      cell: (ctx) => <TruncatedCell value={ctx.getValue()} className="max-w-[240px]" />,
    }),
    helper.accessor((t) => formatCpf(t.cpf), {
      id: "cpf",
      header: dict.admin.table.cpf,
      cell: (ctx) => (
        <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">
          {ctx.getValue()}
        </span>
      ),
    }),
  ]);

  const table = useTable({ features, columns, data: tickets });

  return (
    <div className="hidden lg:block">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-500 dark:text-zinc-400">
          {dict.admin.table.legendLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${LEGEND_SWATCH.open}`} />
          {dict.common.open}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${LEGEND_SWATCH.in_progress}`} />
          {dict.common.inProgress}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${LEGEND_SWATCH.closed}`} />
          {dict.common.closed}
        </span>
      </div>
      <div className="overflow-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[1000px] border-collapse bg-white text-sm dark:bg-zinc-900">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none border-r border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600 last:border-r-0 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    <span className="inline-flex items-center gap-1">
                      <table.FlexRender header={header} />
                      {{
                        asc: <span className="text-zinc-400">▲</span>,
                        desc: <span className="text-zinc-400">▼</span>,
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() =>
                  router.push(`/${locale}/admin/tickets/${row.original.id}`)
                }
                className={`cursor-pointer border-b border-zinc-100 last:border-b-0 dark:border-zinc-800 ${
                  ROW_STATUS_CLASS[row.original.status]
                }`}
              >
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-r border-zinc-100 px-3 py-2 align-middle last:border-r-0 dark:border-zinc-800"
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <p className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {dict.admin.table.empty}
          </p>
        )}
      </div>
    </div>
  );
}
