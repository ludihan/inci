"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { runSqlQuery, type SqlActionState } from "@/lib/actions";
import { SQL_QUERY_MAX_LENGTH } from "@/lib/limits";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

const MAX_HISTORY = 30;

type HistoryEntry = { id: string; result: NonNullable<SqlActionState> };

function cellText(value: unknown): string {
  if (value === null) return "NULL";
  if (value === undefined) return "";
  return String(value);
}

function errorText(dict: Dict, error: string): string {
  if (error === "empty") return dict.admin.sql.errorEmpty;
  if (error === "tooLong") return dict.admin.sql.errorTooLong;
  if (error === "generic") return dict.common.generic;
  return error;
}

function ResultOutput({
  dict,
  result,
}: {
  dict: Dict;
  result: HistoryEntry["result"];
}) {
  if (!result.ok) {
    return (
      <p className="whitespace-pre-wrap text-red-600 dark:text-red-400">
        {errorText(dict, result.error)}
      </p>
    );
  }

  if (result.columns.length === 0) {
    return (
      <p className="text-zinc-700 dark:text-zinc-300">
        {result.changes !== undefined
          ? `${result.changes} ${dict.admin.sql.rowsAffected}`
          : dict.admin.sql.commandExecuted}
        {result.lastInsertRowid !== undefined && result.lastInsertRowid !== "0" && (
          <>
            {" "}
            {dict.admin.sql.lastInsertId} {result.lastInsertRowid}.
          </>
        )}{" "}
        <span className="text-zinc-500 dark:text-zinc-500">
          ({result.elapsedMs.toFixed(1)} ms)
        </span>
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-zinc-500 dark:text-zinc-500">
        {result.rows.length} {dict.admin.sql.rows} · {result.elapsedMs.toFixed(1)} ms
      </p>
      {result.rows.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-500">{dict.admin.sql.noRows}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
          <table className="w-full min-w-max border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                {result.columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  {result.columns.map((col) => (
                    <td
                      key={col}
                      className="whitespace-nowrap px-2 py-1 text-zinc-700 dark:text-zinc-300"
                    >
                      {cellText(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminSqlConsole({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<SqlActionState, FormData>(
    runSqlQuery,
    undefined
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const lastHandled = useRef<SqlActionState>(undefined);
  const outputRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    setHistory((prev) =>
      [...prev, { id: crypto.randomUUID(), result: state }].slice(-MAX_HISTORY)
    );
    setInput("");
  }, [state]);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        {dict.admin.sql.warning}
      </div>

      <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div
          ref={outputRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4 font-mono text-sm"
        >
          {history.length === 0 ? (
            <p className="text-zinc-400 dark:text-zinc-500">{dict.admin.sql.empty}</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id}>
                <p className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  <span className="text-zinc-400 dark:text-zinc-500">{"> "}</span>
                  {entry.result.query}
                </p>
                <div className="mt-1">
                  <ResultOutput dict={dict} result={entry.result} />
                </div>
              </div>
            ))
          )}
        </div>

        <form
          ref={formRef}
          action={action}
          className="flex shrink-0 items-end gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <input type="hidden" name="lang" value={lang} />
          <span className="pb-2 font-mono text-sm text-zinc-400 dark:text-zinc-500">
            {">"}
          </span>
          <textarea
            name="query"
            required
            spellCheck={false}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            maxLength={SQL_QUERY_MAX_LENGTH}
            placeholder={dict.admin.sql.placeholder}
            className="block flex-1 resize-none border-0 bg-transparent font-mono text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <SubmitButton pendingLabel={dict.admin.sql.running}>
            {dict.admin.sql.run}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
