"use client";

import { useActionState } from "react";
import { logoutAction, type ActionResult } from "./actions";

interface LogoutButtonProps {
  className?: string;
  variant?: "header" | "card";
}

export function LogoutButton({ className, variant = "header" }: LogoutButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async (): Promise<ActionResult> => {
      return await logoutAction();
    },
    null
  );

  const defaultClasses =
    variant === "header"
      ? "px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-0 text-xs sm:text-sm font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center cursor-pointer"
      : "w-full sm:w-auto px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center cursor-pointer";

  return (
    <form action={formAction} className="inline-flex flex-col items-end">
      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className={className || defaultClasses}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Keluar...</span>
          </span>
        ) : (
          <span>Keluar</span>
        )}
      </button>
      {state && !state.success && (
        <span role="alert" className="text-[11px] text-rose-600 mt-1 font-medium">
          {state.message}
        </span>
      )}
    </form>
  );
}
