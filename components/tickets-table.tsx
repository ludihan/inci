"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { Ticket, TicketStatus } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge, TicketTypeBadge } from "./badges";
import { CopyButton } from "./copy-button";

const features = tableFeatures({});

// Column ids that the shared ticket-list-filter knows how to sort by.
const SORTABLE = new Set(["assignee", "id", "createdAt", "unit", "subject"]);

// A thin left-edge rail communicates status per-row without washing the whole
// row in a saturated color — the StatusBadge cell already carries the label.
const ROW_RAIL_CLASS: Record<TicketStatus, string> = {
  open: "before:bg-red-500",
  in_progress: "before:bg-amber-500",
  closed: "before:bg-zinc-300 dark:before:bg-zinc-700",
};

const LEGEND_SWATCH: Record<TicketStatus, string> = {
  open: "bg-red-500",
  in_progress: "bg-amber-500",
  closed: "bg-zinc-300 dark:bg-zinc-700",
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
  sort,
  dir,
}: {
  tickets: Ticket[];
  dict: Dict;
  locale: Locale;
  sort?: string;
  dir?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeColumn = sort ?? "createdAt";
  const activeDir = dir ?? "desc";

  const toggleSort = (columnId: string) => {
    if (!SORTABLE.has(columnId)) return;
    const next = new URLSearchParams(searchParams.toString());
    if (activeColumn !== columnId) {
      next.set("sort", columnId);
      next.set("dir", "asc");
    } else if (activeDir === "asc") {
      next.set("sort", columnId);
      next.set("dir", "desc");
    } else {
      next.delete("sort");
      next.delete("dir");
    }
    router.push(`?${next.toString()}`);
  };

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
          className="inline-flex items-center gap-1 font-mono text-xs font-medium whitespace-nowrap text-zinc-900 dark:text-zinc-100"
        >
          {ctx.getValue()}
          <CopyButton value={ctx.getValue()} dict={dict} stopPropagation iconOnly />
        </span>
      ),
    }),
    helper.accessor("createdAt", {
      header: dict.admin.table.createdAt,
      cell: (ctx) => (
        <span className="font-mono text-xs whitespace-nowrap text-zinc-500 tabular-nums dark:text-zinc-400">
          {formatDateTime(ctx.getValue(), locale, ctx.row.original.clientTimezone)}
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
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              {dict.admin.unassigned}
            </span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-500">—</span>
          );
        }
        return <TruncatedCell value={t.assignedToName} className="max-w-[140px]" />;
      },
    }),
    helper.accessor((t) => t.unit?.name ?? "", {
      id: "unit",
      header: dict.admin.table.unit,
      cell: (ctx) => <TruncatedCell value={ctx.getValue()} />,
    }),
    helper.accessor("subject", {
      header: dict.admin.table.subject,
      cell: (ctx) => <TruncatedCell value={ctx.getValue()} className="max-w-[240px]" />,
    }),
    helper.accessor((t) => `#${t.matriculaHash.slice(0, 8)}`, {
      id: "matricula",
      header: dict.admin.table.matricula,
      cell: (ctx) => (
        <span className="font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
          {ctx.getValue()}
        </span>
      ),
    }),
  ]);

  const table = useTable({ features, columns, data: tickets });

  return (
    <div className="hidden lg:block">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
          {dict.admin.table.legendLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${LEGEND_SWATCH.open}`} />
          {dict.common.open}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${LEGEND_SWATCH.in_progress}`} />
          {dict.common.inProgress}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${LEGEND_SWATCH.closed}`} />
          {dict.common.closed}
        </span>
      </div>
      <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[1000px] border-collapse bg-white text-sm dark:bg-zinc-950">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-zinc-200 dark:border-zinc-800"
              >
                {headerGroup.headers.map((header) => {
                  const sortable = SORTABLE.has(header.column.id);
                  const isActive = sortable && activeColumn === header.column.id;
                  return (
                    <th
                      key={header.id}
                      onClick={
                        sortable ? () => toggleSort(header.column.id) : undefined
                      }
                      className={`px-3 py-2 text-left text-xs font-medium whitespace-nowrap tracking-wide text-zinc-500 uppercase select-none dark:text-zinc-400 ${
                        sortable
                          ? "cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
                          : ""
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <table.FlexRender header={header} />
                        {isActive && (
                          <span className="text-zinc-400">
                            {activeDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
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
                className={`relative cursor-pointer border-b border-zinc-100 last:border-b-0 before:absolute before:inset-y-0 before:left-0 before:w-0.5 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/60 ${
                  ROW_RAIL_CLASS[row.original.status]
                }`}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle">
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
