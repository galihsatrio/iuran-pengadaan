import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublicShoppingNotes } from "@/lib/shopping-notes";
import { calculateCashFlow } from "@/lib/expenses";
import { getPaymentSettings } from "@/lib/payment-settings";
import { formatIDR, formatDateOnlyID } from "@/lib/format";

export const metadata = {
  title: "Nota Belanja & Pengeluaran | Iuran Portal Lingkungan",
  description:
    "Rincian nota belanja dan struk pengadaan portal lingkungan secara transparan dan akuntabel bagi warga.",
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
        className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h3 className="font-semibold text-sm text-amber-900">
              Konfigurasi Supabase Belum Lengkap
            </h3>
            <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
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
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center shadow-xs max-w-lg mx-auto">
        <div
          className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl text-slate-600 mb-3"
          aria-hidden="true"
        >
          🔒
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Informasi Tidak Tersedia Saat Ini
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Halaman rincian nota belanja saat ini sedang dinonaktifkan oleh pengurus. Silakan cek kembali nanti atau hubungi pengurus lingkungan untuk informasi lebih lanjut.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-xs"
          >
            <span>&larr;</span>
            <span>Kembali ke Rekap Iuran</span>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch data paralel
  const [iuranData, notes] = await Promise.all([
    supabase ? supabase.from("iuran").select("id, amount") : Promise.resolve({ data: [] }),
    getPublicShoppingNotes(supabase),
  ]);

  const records = (iuranData?.data ?? []) as { id: number; amount: number }[];
  // ponytail: pengeluaran dari nota belanja saja, belum dari expenses table (belum production ready)
  const notaExpenses = notes.map((n) => ({ amount: n.total_amount }));
  const cashFlow = calculateCashFlow(records, notaExpenses);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Ringkasan Kas */}
      <section aria-label="Ringkasan Kas & Belanja">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Pemasukan */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Pemasukan
            </span>
            <div className="mt-2">
              <p className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums">
                {formatIDR(cashFlow.totalIncome)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {records.length} data iuran warga
              </p>
            </div>
          </div>

          {/* Card 2: Pengeluaran */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Pengeluaran
            </span>
            <div className="mt-2">
              <p className="text-base sm:text-lg font-bold text-rose-600 tabular-nums">
                {formatIDR(cashFlow.totalExpense)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Dari {notes.length} nota belanja
              </p>
            </div>
          </div>

          {/* Card 3: Saldo Bersih */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Saldo Kas Bersih
            </span>
            <div className="mt-2">
              <p
                className={`text-base sm:text-lg font-bold tabular-nums ${
                  cashFlow.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatIDR(cashFlow.netBalance)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Pemasukan − pengeluaran
              </p>
            </div>
          </div>

          {/* Card 4: Jumlah Nota */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Jumlah Nota
            </span>
            <div className="mt-2">
              <p className="text-base sm:text-lg font-bold text-slate-800 tabular-nums">
                {notes.length}{" "}
                <span className="text-xs font-normal text-slate-500">Nota</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Dokumen belanja tercatat
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Daftar Nota Belanja */}
      <section aria-labelledby="nota-belanja-heading" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div>
            <h2 id="nota-belanja-heading" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Rincian Nota &amp; Struk Belanja
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar barang dan biaya pengadaan fisik portal yang telah dibelanjakan
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/70 shrink-0">
            {notes.length} Nota
          </span>
        </div>

        {notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
            <div
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-lg text-slate-500 mb-2"
              aria-hidden="true"
            >
              🧾
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Belum Ada Catatan Nota Belanja
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Rincian nota belanja pengadaan portal akan ditampilkan di sini setelah dicatat oleh pengurus.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <article
                key={note.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden"
              >
                {/* Header Nota */}
                <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 font-mono">
                        #{note.id}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug break-words">
                        {note.title}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>📅 {formatDateOnlyID(note.date)}</span>
                      <span>•</span>
                      <span>{note.items?.length ?? 0} item barang</span>
                    </div>
                  </div>

                  <div className="sm:text-right pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/70 shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-none">
                      Total Belanja
                    </span>
                    <span className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums">
                      {formatIDR(note.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Tabel Rincian Barang */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                        <th scope="col" className="py-2 px-3 sm:px-4 w-10 text-center">
                          No
                        </th>
                        <th scope="col" className="py-2 px-3 sm:px-4">
                          Nama Barang
                        </th>
                        <th scope="col" className="py-2 px-3 sm:px-4 text-right w-36 sm:w-44">
                          Harga Satuan / Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {note.items && note.items.length > 0 ? (
                        note.items.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-2 px-3 sm:px-4 text-center text-slate-400 font-mono text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-slate-800 leading-relaxed">
                              {item.item_name}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right text-slate-700 font-medium tabular-nums">
                              {formatIDR(item.item_price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-3 px-4 text-center text-xs text-slate-400 italic"
                          >
                            Rincian barang tidak tersedia untuk nota ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 border-t border-slate-200/80 text-xs sm:text-sm">
                        <td colSpan={2} className="py-2 px-3 sm:px-4 font-semibold text-slate-700 text-right">
                          Total Nota:
                        </td>
                        <td className="py-2 px-3 sm:px-4 text-right font-bold text-emerald-700 tabular-nums">
                          {formatIDR(note.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
    <div aria-label="Memuat Data Pengeluaran & Nota Belanja" className="animate-pulse space-y-6 sm:space-y-8">
      {/* Summary Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs space-y-2"
          >
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
            <div className="h-6 w-28 bg-slate-200 rounded"></div>
            <div className="h-2.5 w-24 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Nota List Skeleton */}
      <div className="space-y-3.5">
        <div className="h-5 w-44 bg-slate-200 rounded"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden"
            >
              <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80 flex justify-between items-center">
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded"></div>
                  <div className="h-3 w-28 bg-slate-200 rounded"></div>
                </div>
                <div className="h-5 w-24 bg-slate-200 rounded"></div>
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NotaBelanjaPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
              IP
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                Iuran Portal Lingkungan
              </h1>
              <p className="text-xs text-slate-500 truncate">
                Transparansi Nota Belanja
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              Rekap Iuran
            </Link>
            <Link
              href="/galeri"
              className="inline-flex items-center px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              Galeri
            </Link>
            <Link
              href="/pengurus"
              className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span>Area Pengurus</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Hero Header */}
        <section className="mb-5 sm:mb-7">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60">
            Transparansi Belanja
          </span>
          <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Nota Belanja &amp; Pengeluaran
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Rincian nota belanja dan struk pembelian barang kebutuhan portal secara transparan dan akuntabel.
          </p>
        </section>

        {/* Dynamic Content */}
        <Suspense fallback={<NotaBelanjaSkeleton />}>
          <NotaBelanjaContent />
        </Suspense>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-slate-400 pb-8">
          Sistem Informasi Iuran Swadaya Warga &bull; Transparansi Nota Belanja Lingkungan
        </footer>
      </main>
    </div>
  );
}
