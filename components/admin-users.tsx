"use client";

import { useActionState } from "react";
import {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  type ActionState,
} from "@/lib/actions";
import type { Admin, AdminRole, Module } from "@/lib/types";
import type { Dict, Locale } from "@/lib/i18n";
import { SubmitButton } from "./submit-button";

const MODULES: Module[] = ["it", "maintenance"];

function moduleLabel(dict: Dict, module: Module): string {
  switch (module) {
    case "it":
      return dict.admin.users.permIT;
    case "maintenance":
      return dict.admin.users.permMaintenance;
  }
}

function roleLabel(dict: Dict, role: AdminRole): string {
  return dict.admin.users.roles[role];
}

function errorText(state: ActionState, dict: Dict): string | null {
  if (!state?.error) return null;
  if (state.error === "duplicate-username")
    return dict.admin.users.duplicateUsername;
  if (state.error === "not-found") return dict.common.notFound;
  return dict.common.generic;
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";

function RoleRadio({
  name,
  role,
  defaultValue,
  dict,
}: {
  name: string;
  role: AdminRole;
  defaultValue: AdminRole;
  dict: Dict;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="radio"
        name={name}
        value={role}
        defaultChecked={defaultValue === role}
        className="h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
      />
      {roleLabel(dict, role)}
    </label>
  );
}

function PermissionsCheckboxes({
  defaultValue,
  dict,
}: {
  defaultValue: Module[];
  dict: Dict;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {dict.admin.users.permissions}
      </p>
      {MODULES.map((module) => (
        <label
          key={module}
          className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
        >
          <input
            type="checkbox"
            name="permissions"
            value={module}
            defaultChecked={defaultValue.includes(module)}
            className="h-4 w-4 rounded accent-zinc-900 dark:accent-zinc-50"
          />
          {moduleLabel(dict, module)}
        </label>
      ))}
    </div>
  );
}

function AdminCard({
  admin,
  current,
  dict,
  lang,
}: {
  admin: Admin;
  current: Admin;
  dict: Dict;
  lang: Locale;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateAdmin,
    undefined
  );
  const isSelf = admin.id === current.id;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {admin.name}{" "}
            {isSelf && (
              <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {dict.admin.users.active}
              </span>
            )}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            @{admin.username} · {roleLabel(dict, admin.role)}
          </p>
        </div>
        <form action={deleteAdmin}>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="id" value={admin.id} />
          <button
            type="submit"
            disabled={isSelf}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950"
          >
            {dict.admin.users.delete}
          </button>
        </form>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="id" value={admin.id} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`name-${admin.id}`}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.users.name}
            </label>
            <input
              id={`name-${admin.id}`}
              name="name"
              required
              defaultValue={admin.name}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor={`username-${admin.id}`}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.users.username}
            </label>
            <input
              id={`username-${admin.id}`}
              name="username"
              required
              defaultValue={admin.username}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`password-${admin.id}`}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {dict.admin.users.password}{" "}
            <span className="font-normal text-zinc-400">
              ({dict.common.optional})
            </span>
          </label>
          <input
            id={`password-${admin.id}`}
            name="password"
            type="password"
            minLength={6}
            placeholder="••••••••"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {dict.admin.users.passwordHelp}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.admin.users.role}
          </p>
          <div className="flex gap-6">
            <RoleRadio
              name="role"
              role="admin"
              defaultValue={admin.role}
              dict={dict}
            />
            <RoleRadio
              name="role"
              role="superadmin"
              defaultValue={admin.role}
              dict={dict}
            />
          </div>
        </div>

        <PermissionsCheckboxes
          defaultValue={admin.permissions}
          dict={dict}
        />

        {errorText(state, dict) && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {errorText(state, dict)}
          </p>
        )}

        <SubmitButton pendingLabel={dict.common.loading}>
          {dict.admin.users.save}
        </SubmitButton>
      </form>
    </div>
  );
}

function NewAdminForm({ dict, lang }: { dict: Dict; lang: Locale }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createAdmin,
    undefined
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {dict.admin.users.newTitle}
      </h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="lang" value={lang} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="new-name"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.users.name}
            </label>
            <input
              id="new-name"
              name="name"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="new-username"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.users.username}
            </label>
            <input
              id="new-username"
              name="username"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {dict.admin.users.password}
            </label>
            <input
              id="new-password"
              name="password"
              type="password"
              required
              minLength={6}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.admin.users.role}
          </p>
          <div className="flex gap-6">
            <RoleRadio name="role" role="admin" defaultValue="admin" dict={dict} />
            <RoleRadio
              name="role"
              role="superadmin"
              defaultValue="admin"
              dict={dict}
            />
          </div>
        </div>

        <PermissionsCheckboxes defaultValue={["it"]} dict={dict} />

        {errorText(state, dict) && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {errorText(state, dict)}
          </p>
        )}

        <SubmitButton pendingLabel={dict.common.loading}>
          {dict.admin.users.create}
        </SubmitButton>
      </form>
    </div>
  );
}

export function AdminUsersManager({
  admins,
  current,
  dict,
  lang,
}: {
  admins: Admin[];
  current: Admin;
  dict: Dict;
  lang: Locale;
}) {
  return (
    <div className="space-y-6">
      <NewAdminForm dict={dict} lang={lang} />
      <div className="space-y-6">
        {admins.map((admin) => (
          <AdminCard
            key={admin.id}
            admin={admin}
            current={current}
            dict={dict}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}
