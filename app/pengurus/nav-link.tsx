"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode } from "react";

function NavLinkPendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 ml-auto transition-opacity duration-150 ${
        pending ? "opacity-100 animate-ping" : "opacity-0"
      }`}
    />
  );
}

interface PengurusNavLinkProps extends Partial<ComponentProps<typeof Link>> {
  children: ReactNode;
  icon?: ReactNode;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  href?: ComponentProps<typeof Link>["href"];
}

export function PengurusNavLink({
  children,
  icon,
  href,
  isActive,
  className = "",
  onClick,
  disabled = false,
  disabledReason,
  ...props
}: PengurusNavLinkProps) {
  const pathname = usePathname();
  const hrefString = typeof href === "string" ? href : href?.pathname || "";

  if (disabled) {
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-3 border-transparent text-sm min-h-[44px] text-slate-400 bg-slate-50/60 cursor-not-allowed select-none ${className}`}
        title={disabledReason || "Menu sementara dikunci"}
        aria-disabled="true"
      >
        {icon && (
          <span className="shrink-0 text-slate-300" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="truncate flex-1">{children}</span>
        <svg
          className="w-4 h-4 text-slate-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
    );
  }

  const active =
    isActive !== undefined
      ? isActive
      : hrefString === "/pengurus"
      ? pathname === "/pengurus"
      : pathname === hrefString || pathname.startsWith(`${hrefString}/`);

  const activeClasses = active
    ? "bg-emerald-50 text-emerald-800 font-semibold border-emerald-600 shadow-xs"
    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent";

  return (
    <Link
      href={href ?? "#"}
      onClick={onClick}
      {...props}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-3 text-sm transition-all duration-150 min-h-[44px] ${activeClasses} ${className}`}
      aria-current={active ? "page" : undefined}
    >
      {icon && (
        <span
          className={`shrink-0 transition-colors ${
            active ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="truncate flex-1">{children}</span>
      <NavLinkPendingIndicator />
    </Link>
  );
}
