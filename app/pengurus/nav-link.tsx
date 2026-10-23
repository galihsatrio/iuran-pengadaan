"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode } from "react";

function NavLinkPendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 ml-1.5 transition-opacity duration-150 ${
        pending ? "opacity-100 animate-ping" : "opacity-0"
      }`}
    />
  );
}

interface PengurusNavLinkProps extends ComponentProps<typeof Link> {
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

export function PengurusNavLink({
  children,
  href,
  isActive,
  className = "",
  ...props
}: PengurusNavLinkProps) {
  const pathname = usePathname();
  const hrefString = typeof href === "string" ? href : href.pathname || "";

  const active =
    isActive !== undefined
      ? isActive
      : hrefString === "/pengurus"
      ? pathname === "/pengurus"
      : pathname === hrefString || pathname.startsWith(`${hrefString}/`);

  const activeClasses = active
    ? "border-emerald-600 text-emerald-700 font-semibold"
    : "border-transparent text-slate-600 hover:text-slate-900";

  return (
    <Link
      href={href}
      {...props}
      className={`py-3 border-b-2 shrink-0 min-h-[44px] inline-flex items-center transition-colors ${activeClasses} ${className}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="truncate">{children}</span>
      <NavLinkPendingIndicator />
    </Link>
  );
}
