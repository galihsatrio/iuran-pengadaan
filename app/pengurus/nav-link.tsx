"use client";

import Link, { useLinkStatus } from "next/link";
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
  isActive = false,
  className = "",
  ...props
}: PengurusNavLinkProps) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center transition-colors ${className}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="truncate">{children}</span>
      <NavLinkPendingIndicator />
    </Link>
  );
}
