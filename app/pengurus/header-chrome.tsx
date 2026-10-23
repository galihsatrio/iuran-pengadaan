"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { PengurusNavLink } from "./nav-link";

interface PengurusHeaderChromeProps {
  userEmail: string;
}

const MENU_ITEMS = [
  {
    href: "/pengurus",
    label: "Data Iuran Warga",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/pengurus/master-bendahara",
    label: "Master Bendahara & QRIS",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: "/pengurus/pengeluaran",
    label: "Pengeluaran Kas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/pengurus/galeri",
    label: "Galeri Kegiatan",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/pengurus/pengaturan",
    label: "Pengaturan",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function PengurusHeaderChrome({ userEmail }: PengurusHeaderChromeProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const drawerId = useId();

  // Close mobile drawer on route change during render without effect cascade
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  const closeDrawer = useCallback(() => setIsOpen(false), []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isGaleri = pathname.startsWith("/pengurus/galeri");
  const isPengeluaranSubpage =
    pathname.startsWith("/pengurus/pengeluaran/") &&
    pathname !== "/pengurus/pengeluaran";

  const isPengeluaranTambah = pathname === "/pengurus/pengeluaran/tambah";
  const expenseIdMatch = pathname.match(/^\/pengurus\/pengeluaran\/(\d+)/);

  return (
    <>
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-controls={drawerId}
              aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              {isOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <Link href="/pengurus" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 transition-colors">
                IP
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none truncate">
                    Portal Pengurus
                  </h1>
                  <span className="hidden xs:inline-flex sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                    Allowlisted
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[130px] sm:max-w-xs">{userEmail}</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isPengeluaranSubpage ? (
              <Link
                href="/pengurus/pengeluaran"
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
              >
                &larr; Batal &amp; Kembali
              </Link>
            ) : (
              <>
                {isGaleri && (
                  <Link
                    href="/galeri"
                    className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
                  >
                    Lihat Galeri Publik
                  </Link>
                )}
                <Link
                  href="/"
                  className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
                >
                  Tampilan Publik
                </Link>
              </>
            )}
            <LogoutButton />
          </div>
        </div>

        {/* Subpage Breadcrumb indicator if on subpage */}
        {isPengeluaranSubpage && (
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/pengurus/pengeluaran" className="hover:text-emerald-700 hover:underline">
              Pengeluaran Kas
            </Link>
            <span>&gt;</span>
            <span className="text-slate-800 font-semibold truncate max-w-xs">
              {isPengeluaranTambah
                ? "Tambah Pengeluaran"
                : `Edit Pengeluaran #${expenseIdMatch ? expenseIdMatch[1] : ""}`}
            </span>
          </div>
        )}
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Navigation */}
      <aside
        id={drawerId}
        aria-label="Menu Pengurus Mobile"
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white border-r border-slate-200 shadow-xl z-40 lg:hidden flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              IP
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block leading-tight">Menu Pengurus</span>
              <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">{userEmail}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Tutup menu navigasi"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigasi Utama
          </div>
          {MENU_ITEMS.map((item) => (
            <PengurusNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              onClick={closeDrawer}
            >
              {item.label}
            </PengurusNavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <Link
              href="/"
              onClick={closeDrawer}
              className="font-medium hover:text-emerald-700 hover:underline min-h-[44px] inline-flex items-center"
            >
              &larr; Tampilan Publik
            </Link>
          </div>
          <LogoutButton variant="card" />
        </div>
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        aria-label="Menu Pengurus Desktop"
        className="hidden lg:flex lg:flex-col fixed top-[61px] bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-10 overflow-y-auto"
      >
        <div className="p-4 flex-1 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Pengurus
          </div>
          {MENU_ITEMS.map((item) => (
            <PengurusNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
            >
              {item.label}
            </PengurusNavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate">{userEmail}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
