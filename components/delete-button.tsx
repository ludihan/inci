"use client";

const baseClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/50";

/**
 * Submit button for a delete `<form action={...}>` that asks the user to
 * confirm before the form is submitted. Cancelling the native confirm dialog
 * calls `preventDefault()` so the Server Action never runs.
 */
export function DeleteButton({
  children = "Excluir",
  confirmMessage = "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.",
  disabled,
  className,
}: {
  children?: React.ReactNode;
  confirmMessage?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      className={className ?? baseClass}
    >
      {children}
    </button>
  );
}
