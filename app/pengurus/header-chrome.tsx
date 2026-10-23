"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { PengurusNavLink } from "./nav-link";

interface PengurusHeaderChromeProps {
  userEmail: string;
}

export function PengurusHeaderChrome({ userEmail }: PengurusHeaderChromeProps) {
  const pathname = usePathname();

  const isGaleri = pathname.startsWith("/pengurus/galeri");
  const isPengeluaranSubpage =
    pathname.startsWith("/pengurus/pengeluaran/") &&
    pathname !== "/pengurus/pengeluaran";

  const isPengeluaranTambah = pathname === "/pengurus/pengeluaran/tambah";
  const expenseIdMatch = pathname.match(/^\/pengurus\/pengeluaran\/(\d+)/);

  return (
    <>
      {/* Pengurus Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
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
      </header>

      {/* Navigation Subheader / Breadcrumb Tabs */}
      <div className="border-b border-slate-200 bg-white">
        {isPengeluaranSubpage ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
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
        ) : (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
            <PengurusNavLink href="/pengurus">Data Iuran Warga</PengurusNavLink>
            <PengurusNavLink href="/pengurus/master-bendahara">
              Master Bendahara &amp; QRIS
            </PengurusNavLink>
            <PengurusNavLink href="/pengurus/pengeluaran">
              Pengeluaran Kas
            </PengurusNavLink>
            <PengurusNavLink href="/pengurus/galeri">
              Galeri Kegiatan
            </PengurusNavLink>
            <PengurusNavLink href="/pengurus/pengaturan">
              Pengaturan
            </PengurusNavLink>
          </div>
        )}
      </div>
    </>
  );
}
