import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublicShoppingNotes } from "@/lib/shopping-notes";
import {
  getPublicExpenses,
  calculateCashFlow,
  groupExpensesByProcurement,
} from "@/lib/expenses";
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

  // Fetch semua data paralel
  const [iuranData, expenses, notes] = await Promise.all([
    supabase ? supabase.from("iuran").select("id, amount") : Promise.resolve({ data: [] }),
    getPublicExpenses(supabase),
    getPublicShoppingNotes(supabase),
  ]);

  const records = (iuranData?.data ?? []) as { id: number; amount: number }[];
  const cashFlow = calculateCashFlow(records, expenses);
  const procurementGroups = groupExpensesByProcurement(expenses);

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* 1. Summary Cards */}
      <section aria-label="Ringkasan Kas & Belanja">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Dana Terkumpul */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-0 leading-snug">
                Total Dana Terkumpul
              </span>
              <div
                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 ring-1 ring-emerald-200/60"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="mt-3 min-w-0">
              <p className="text-lg sm:text-xl lg:text-lg xl:text-xl font-extrabold text-emerald-600 whitespace-nowrap tracking-tight">
                {formatIDR(cashFlow.totalIncome)}
              </p>
              <p className="mt-1 text-xs text-slate-500 min-w-0 leading-relaxed">
                Dari {records.length} catatan iuran warga
              </p>
            </div>
          </div>

          {/* Card 2: Total Pengeluaran */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-0 leading-snug">
                Total Pengeluaran
              </span>
              <div
                className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 ring-1 ring-rose-200/60"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
            <div className="mt-3 min-w-0">
              <p className="text-lg sm:text-xl lg:text-lg xl:text-xl font-extrabold text-rose-600 whitespace-nowrap tracking-tight">
                {formatIDR(cashFlow.totalExpense)}
              </p>
              <p className="mt-1 text-xs text-slate-500 min-w-0 leading-relaxed">
                Dari {expenses.length} alokasi kas
              </p>
            </div>
          </div>

          {/* Card 3: Saldo Kas Bersih */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-0 leading-snug">
                Saldo Kas Bersih
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-1 ${
                  cashFlow.netBalance >= 0
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
                    : "bg-rose-50 text-rose-700 ring-rose-200/60"
                }`}
                aria-hidden="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-3 min-w-0">
              <p
                className={`text-lg sm:text-xl lg:text-lg xl:text-xl font-extrabold whitespace-nowrap tracking-tight ${
                  cashFlow.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatIDR(cashFlow.netBalance)}
              </p>
              <p className="mt-1 text-xs text-slate-500 min-w-0 leading-relaxed">
                Pemasukan dikurangi pengeluaran
              </p>
            </div>
          </div>

          {/* Card 4: Total Nota Tercatat */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0">
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-0 leading-snug">
                Total Nota Tercatat
              </span>
              <div
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 ring-1 ring-slate-200/60"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-3 min-w-0">
              <p className="text-lg sm:text-xl lg:text-lg xl:text-xl font-extrabold text-slate-900 whitespace-nowrap tracking-tight">
                {notes.length}{" "}
                <span className="text-sm sm:text-base font-normal text-slate-500">
                  Nota
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500 min-w-0 leading-relaxed">
                Daftar seluruh nota pembelanjaan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Section Rincian Pengeluaran */}
      <section aria-labelledby="rincian-pengeluaran-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 id="rincian-pengeluaran-heading" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Rincian Pengeluaran Kas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Daftar seluruh pemakaian kas portal lingkungan dikelompokkan berdasarkan proyek atau kegiatan
            </p>
          </div>
          <div className="text-sm font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200/60 self-start sm:self-auto shrink-0">
            Total Pengeluaran: {formatIDR(cashFlow.totalExpense)}
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
            <div
              className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl text-slate-500 mb-4"
              aria-hidden="true"
            >
              🧾
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Belum Ada Catatan Pengeluaran
            </h3>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              Semua alokasi biaya dan pemakaian kas lingkungan akan ditampilkan di sini secara terbuka setelah dicatat oleh pengurus.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {procurementGroups.map((grp) => (
              <div
                key={grp.isUngrouped ? "__ungrouped__" : grp.groupName}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Header Group */}
                <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        grp.isUngrouped ? "bg-slate-400" : "bg-emerald-500"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                        {grp.groupName}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        {grp.items.length} item pengeluaran
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs sm:text-sm uppercase font-semibold text-slate-500 block">
                      Subtotal Kelompok
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-rose-700 tabular-nums">
                      {formatIDR(grp.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Tabel Item Pengeluaran */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                        <th scope="col" className="py-3 sm:py-3.5 px-4 sm:px-6 w-36 sm:w-44 whitespace-nowrap">
                          Tanggal
                        </th>
                        <th scope="col" className="py-3 sm:py-3.5 px-4 sm:px-6">
                          Deskripsi Pengeluaran
                        </th>
                        <th scope="col" className="py-3 sm:py-3.5 px-4 sm:px-6 text-right w-36 sm:w-48 whitespace-nowrap">
                          Jumlah
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 text-sm sm:text-base">
                      {grp.items.map((expense) => (
                        <tr
                          key={expense.id}
                          className="odd:bg-white even:bg-slate-50/50 hover:bg-slate-100/60 transition-colors"
                        >
                          <td className="py-3 sm:py-4 px-4 sm:px-6 text-slate-600 text-sm sm:text-base whitespace-nowrap">
                            {formatDateOnlyID(expense.date)}
                          </td>
                          <td className="py-3 sm:py-4 px-4 sm:px-6 font-medium text-slate-900 leading-relaxed">
                            {expense.description}
                          </td>
                          <td className="py-3 sm:py-4 px-4 sm:px-6 text-right font-bold text-rose-600 tabular-nums whitespace-nowrap">
                            - {formatIDR(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Section Nota Belanja */}
      <section aria-labelledby="nota-belanja-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 id="nota-belanja-heading" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Nota &amp; Struk Belanja
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Rincian nota pembelanjaan kebutuhan fisik portal beserta daftar barang yang dibeli
            </p>
          </div>
          <div className="text-sm font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 self-start sm:self-auto shrink-0">
            {notes.length} Dokumen Nota Tercatat
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
            <div
              className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl text-slate-500 mb-4"
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
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Header Card */}
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                      {note.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span aria-hidden="true">📅</span>
                        <time dateTime={note.date}>
                          {formatDateOnlyID(note.date)}
                        </time>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200/60">
                        {note.items?.length ?? 0} item barang
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <span className="text-xs sm:text-sm uppercase font-semibold text-slate-500 block">
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
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                        <th scope="col" className="py-3 sm:py-3.5 px-4 sm:px-6 w-12 sm:w-16 text-center">
                          No.
                        </th>
                        <th scope="col" className="py-3 sm:py-3.5 px-4 sm:px-6">
                          Nama Barang / Kebutuhan
                        </th>
                        <th scope="col" className="py-3 sm:py-3.5 px-4 sm:px-6 text-right w-40 sm:w-52">
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
                            <td className="py-3 sm:py-4 px-4 sm:px-6 text-center text-slate-400 text-sm sm:text-base font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-3 sm:py-4 px-4 sm:px-6 font-medium text-slate-900 leading-relaxed">
                              {item.item_name}
                            </td>
                            <td className="py-3 sm:py-4 px-4 sm:px-6 text-right font-semibold text-slate-900 tabular-nums">
                              {formatIDR(item.item_price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-4 px-6 text-center text-sm sm:text-base text-slate-500 italic"
                          >
                            Rincian barang tidak tersedia untuk nota ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Card */}
                <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-500">
                    ID Nota: #{note.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Total Belanja:</span>
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                      {formatIDR(note.total_amount)}
                    </span>
                  </div>
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
    <div aria-label="Memuat Data Pengeluaran & Nota Belanja" className="animate-pulse space-y-10">
      {/* Summary Skeleton (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-slate-200 rounded"></div>
              <div className="w-8 h-8 rounded-full bg-slate-200"></div>
            </div>
            <div className="h-7 w-32 bg-slate-200 rounded"></div>
            <div className="h-3 w-40 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Section 1 Skeleton (Expenses) */}
      <div className="space-y-4">
        <div className="h-6 w-56 bg-slate-200 rounded"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="h-5 w-44 bg-slate-200 rounded"></div>
                <div className="h-5 w-28 bg-slate-200 rounded"></div>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                <div className="h-5 w-full bg-slate-200 rounded"></div>
                <div className="h-5 w-full bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 Skeleton (Notes) */}
      <div className="space-y-4">
        <div className="h-6 w-52 bg-slate-200 rounded"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-slate-200 rounded"></div>
                  <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
                <div className="h-7 w-32 bg-slate-200 rounded"></div>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                <div className="h-5 w-full bg-slate-200 rounded"></div>
                <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
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
