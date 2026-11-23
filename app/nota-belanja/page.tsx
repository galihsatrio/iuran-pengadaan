import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublicShoppingNotes } from "@/lib/shopping-notes";
import { getPaymentSettings } from "@/lib/payment-settings";
import { formatIDR, formatDateOnlyID } from "@/lib/format";

export const metadata = {
  title: "Nota Belanja & Pengeluaran | Iuran Portal Lingkungan",
  description: "Rincian nota belanja dan struk pengadaan portal lingkungan secara transparan dan akuntabel bagi warga.",
};

// ponytail: Direct server component query wrapped in Suspense with caching. Fetches public view without photos.
async function NotaBelanjaContent() {
  "use cache";
  cacheLife("minutes");

  const configured = isSupabaseConfigured();
  if (!configured) {
    return (
      <div
        role="alert"
        className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h3 className="font-semibold text-base text-amber-900">
              Konfigurasi Supabase Belum Lengkap
            </h3>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              Variabel lingkungan Supabase belum terkonfigurasi. Data nota belanja belum dapat ditampilkan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const supabase = getPublicSupabase();
  const settings = supabase ? await getPaymentSettings(supabase) : null;
  const showNotaBelanja = settings?.show_nota_belanja_on_public ?? true;

  if (!showNotaBelanja) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto">
        <div
          className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl text-slate-600 mb-4"
          aria-hidden="true"
        >
          🔒
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">
          Informasi Tidak Tersedia Saat Ini
        </h3>
        <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
          Halaman rincian nota belanja saat ini sedang dinonaktifkan oleh pengurus. Silakan cek kembali nanti atau hubungi pengurus lingkungan untuk informasi lebih lanjut.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-xs"
          >
            <span>&larr;</span>
            <span>Kembali ke Rekap Iuran</span>
          </Link>
        </div>
      </div>
    );
  }

  const notes = await getPublicShoppingNotes(supabase);
  const totalNotes = notes.length;
  const totalAmount = notes.reduce((sum, n) => sum + (n.total_amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <section aria-label="Ringkasan Nota Belanja" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500">
            Total Nota Tercatat
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totalNotes}{" "}
            <span className="text-base sm:text-lg font-normal text-slate-500">
              Nota
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Daftar seluruh nota pembelanjaan kebutuhan lingkungan
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500">
            Total Pengeluaran Nota
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-emerald-700">
            {formatIDR(totalAmount)}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Akumulasi nilai seluruh belanja barang portal
          </p>
        </div>
      </section>

      {/* Daftar Nota */}
      <section aria-label="Daftar Nota Belanja Warga" className="space-y-6">
        {notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
            <div
              className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl text-slate-600 mb-4"
              aria-hidden="true"
            >
              🧾
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Belum Ada Catatan Nota Belanja
            </h3>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              Rincian nota belanja pengadaan portal akan ditampilkan di sini secara transparan setelah dicatat oleh pengurus.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <article
                key={note.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Header Card */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {note.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <span aria-hidden="true">📅</span>
                      <time dateTime={note.date}>
                        {formatDateOnlyID(note.date)}
                      </time>
                    </div>
                  </div>

                  <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-xs uppercase font-semibold text-slate-500 block">
                      Total Belanja
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                      {formatIDR(note.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Rincian Barang */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                        <th scope="col" className="py-3 px-4 sm:px-6 w-12 text-center">
                          No.
                        </th>
                        <th scope="col" className="py-3 px-4 sm:px-6">
                          Nama Barang / Kebutuhan
                        </th>
                        <th scope="col" className="py-3 px-4 sm:px-6 text-right w-44">
                          Harga Satuan / Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 text-sm sm:text-base">
                      {note.items && note.items.length > 0 ? (
                        note.items.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="odd:bg-white even:bg-slate-50/60 hover:bg-emerald-50/30 transition-colors"
                          >
                            <td className="py-3 sm:py-3.5 px-4 sm:px-6 text-center text-slate-400 text-sm font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-3 sm:py-3.5 px-4 sm:px-6 font-medium text-slate-900 leading-relaxed">
                              {item.item_name}
                            </td>
                            <td className="py-3 sm:py-3.5 px-4 sm:px-6 text-right font-semibold text-slate-900 tabular-nums">
                              {formatIDR(item.item_price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-4 px-6 text-center text-sm text-slate-500 italic"
                          >
                            Rincian barang tidak tersedia untuk nota ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Card */}
                <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm text-slate-600">
                  <span className="font-medium">
                    {note.items?.length ?? 0} item barang tertera
                  </span>
                  <span className="text-slate-400">
                    ID Nota: #{note.id}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NotaBelanjaSkeleton() {
  return (
    <div aria-label="Memuat Nota Belanja" className="animate-pulse space-y-8">
      {/* Summary Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
          <div className="h-8 w-24 bg-slate-200 rounded"></div>
          <div className="h-3 w-48 bg-slate-200 rounded"></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="h-4 w-36 bg-slate-200 rounded"></div>
          <div className="h-8 w-36 bg-slate-200 rounded"></div>
          <div className="h-3 w-48 bg-slate-200 rounded"></div>
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-slate-200 rounded"></div>
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
              </div>
              <div className="h-7 w-28 bg-slate-200 rounded"></div>
            </div>
            <div className="p-6 space-y-3">
              <div className="h-5 w-full bg-slate-200 rounded"></div>
              <div className="h-5 w-full bg-slate-200 rounded"></div>
              <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotaBelanjaPage() {
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
                Transparansi Nota Belanja
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
              href="/galeri"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span>Galeri</span>
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
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60">
              Transparansi Belanja
            </span>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Nota Belanja &amp; Pengeluaran
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Rincian nota belanja dan struk pembelian barang kebutuhan portal secara transparan dan akuntabel.
            </p>
          </div>
        </section>

        {/* Dynamic Content */}
        <Suspense fallback={<NotaBelanjaSkeleton />}>
          <NotaBelanjaContent />
        </Suspense>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400 pb-8">
          Sistem Informasi Iuran Swadaya Warga &bull; Transparansi Nota Belanja Lingkungan
        </footer>
      </main>
    </div>
  );
}
