import Link from "next/link";
import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublicGalleryItems } from "@/lib/gallery";
import type { PublicGalleryItem } from "@/lib/types";
import GalleryView from "./gallery-view";

export const metadata = {
  title: "Galeri Dokumentasi Kerja Bakti & Hasil | Iuran Portal Lingkungan",
  description: "Dokumentasi foto kegiatan kerja bakti warga dan hasil pengadaan portal lingkungan secara transparan.",
};

// ponytail: Direct server component query wrapped in Suspense for instant public shell streaming. Upgrade to server pagination if gallery grows past 100 photos.
async function GalleryContent() {
  const configured = isSupabaseConfigured();
  let items: PublicGalleryItem[] = [];

  if (configured) {
    const supabase = await getServerSupabase();
    items = await getPublicGalleryItems(supabase);
  }

  return <GalleryView initialItems={items} />;
}

function GallerySkeleton() {
  return (
    <div aria-label="Memuat Galeri Foto" className="animate-pulse">
      {/* Category Filter Tabs Skeleton */}
      <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
        <div className="h-10 w-28 bg-slate-200 rounded-lg"></div>
        <div className="h-10 w-36 bg-slate-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
          >
            <div className="h-48 sm:h-52 bg-slate-200"></div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
              </div>
              <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
              <div className="h-3 w-full bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GaleriPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              IP
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                Iuran Portal Lingkungan
              </h1>
              <p className="text-xs text-slate-500 truncate">
                Dokumentasi &amp; Galeri Warga
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span>Rekap Iuran</span>
            </Link>
            <Link
              href="/pengurus"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span>Area Pengurus</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Hero Header */}
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60">
                Dokumentasi Warga
              </span>
              <h2 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Galeri Foto Kerja Bakti &amp; Hasil
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
                Dokumentasi transparansi kegiatan gotong royong warga dan realisasi pemasangan serta pemeliharaan portal lingkungan.
              </p>
            </div>
          </div>
        </section>

        {!configured && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <h3 className="font-semibold text-base text-amber-950">
                  Konfigurasi Supabase Belum Terpasang
                </h3>
                <p className="mt-1 text-sm text-amber-800">
                  Foto galeri memerlukan koneksi database Supabase. Silakan atur konfigurasi pada berkas .env.local.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gallery View Component under Suspense */}
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryContent />
        </Suspense>

        <footer className="mt-12 text-center text-xs text-slate-400 pb-8">
          Sistem Informasi Iuran Swadaya Warga &bull; Galeri Dokumentasi Kegiatan
        </footer>
      </main>
    </div>
  );
}
