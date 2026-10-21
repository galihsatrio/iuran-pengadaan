import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatIDR, formatWhatsAppUrl, formatDateOnlyID } from "@/lib/format";
import { getActiveTreasurers } from "@/lib/treasurers";
import { getPublicExpenses, calculateCashFlow } from "@/lib/expenses";
import { getPaymentSettings } from "@/lib/payment-settings";
import { getPublicGalleryItems } from "@/lib/gallery";
import type { IuranRecord, PublicExpense, PublicGalleryItem } from "@/lib/types";
import {
  DUES_TARGET,
  calculateResidentTotals,
  calculateResidentDuesStatus,
  calculateResidentExcessDonations,
  getResidentKey,
  sortRecordsByCumulativePaidDesc,
} from "@/lib/dues";


// ponytail: Direct server component query wrapped in Suspense for instant static shell streaming. Upgrade to pagination if records exceed 200 items.
async function IuranContent() {
  const configured = isSupabaseConfigured();

  let records: IuranRecord[] = [];
  let expenses: PublicExpense[] = [];
  let showExpenses = true;
  let showDonations = true;
  let errorMessage: string | null = null;

  if (configured) {
    const supabase = await getServerSupabase();
    if (supabase) {
      const settings = await getPaymentSettings(supabase);
      showExpenses = settings.show_expenses_on_home ?? true;
      showDonations = settings.show_donations_on_home ?? true;

      // Public warga query: only requested public fields, no secret/auth fields
      const { data, error } = await supabase
        .from("iuran")
        .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        errorMessage = error.message;
      } else if (data) {
        records = data as IuranRecord[];
      }

      // Public expenses query: only safe disclosure fields (no receipt path or user IDs)
      // Only fetch if showExpenses is true to prevent leaking expense details
      if (showExpenses) {
        expenses = await getPublicExpenses(supabase);
      }
    }
  }

  const cashFlow = calculateCashFlow(records, expenses);

  return (
    <>
      {/* Overview Stats */}
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">
          Ringkasan Kas Iuran &amp; Pengeluaran
        </h2>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showExpenses ? "lg:grid-cols-4" : "lg:grid-cols-2"} gap-4`}>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Dana Terkumpul
            </span>
            <p className="mt-2 text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-extrabold text-emerald-600 break-words tracking-tight">
              {formatIDR(cashFlow.totalIncome)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Dari {records.length} catatan iuran warga
            </p>
          </div>

          {showExpenses && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Pengeluaran
                </span>
                <p className="mt-2 text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-extrabold text-rose-600 break-words tracking-tight">
                  {formatIDR(cashFlow.totalExpense)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Dari {expenses.length} alokasi kas
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Saldo Kas Bersih
                </span>
                <p
                  className={`mt-2 text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-extrabold break-words tracking-tight ${
                    cashFlow.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatIDR(cashFlow.netBalance)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Pemasukan dikurangi pengeluaran
                </p>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Partisipasi
            </span>
            <p className="mt-2 text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-extrabold text-slate-800 break-words tracking-tight">
              {records.length} <span className="text-base font-medium text-slate-500">Warga</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pengadaan &amp; pemeliharaan portal
            </p>
          </div>
        </div>
      </section>

      {/* Table & Actions */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-5 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Daftar Riwayat Iuran Warga
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan transparan kontribusi swadaya warga
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-sm text-rose-700">
            Terjadi kesalahan saat memuat data: {errorMessage}
          </div>
        )}

        {records.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              📋
            </div>
            <h3 className="text-sm font-semibold text-slate-700">
              Belum ada data iuran
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Catatan pembayaran akan tampil secara otomatis setelah pengurus
              mencatat kontribusi warga di sistem.
            </p>
          </div>
        ) : (() => {
          const residentTotals = calculateResidentTotals(records);

          return (
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {Object.entries(
                records.reduce<Record<string, IuranRecord[]>>((acc, item) => {
                  const key = item.nama_blok?.trim() || "Lainnya";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => a.localeCompare(b, "id", { numeric: true, sensitivity: "base" }))
                .map(([namaBlok, blockRecords]) => {
                  const blockTotal = blockRecords.reduce(
                    (sum, r) => sum + Number(r.amount || 0),
                    0
                  );

                  // Calculate true unique households and stage counts for dynamic block summary
                  const residentMap = new Map<string, { cumulative: number; status: ReturnType<typeof calculateResidentDuesStatus> }>();
                  for (const item of blockRecords) {
                    const rKey = getResidentKey(item);
                    if (!residentMap.has(rKey)) {
                      const cumulative = residentTotals.get(rKey) || Number(item.amount || 0);
                      const status = calculateResidentDuesStatus(cumulative);
                      residentMap.set(rKey, { cumulative, status });
                    }
                  }
                  const uniqueHouseholdCount = residentMap.size;
                  let lunasCount = 0;
                  const incompleteStageMap = new Map<string, { label: string; count: number; stage: number }>();

                  for (const { status } of residentMap.values()) {
                    if (status.stage === 3) {
                      lunasCount += 1;
                    } else {
                      const label = status.stageLabel;
                      const existing = incompleteStageMap.get(label);
                      if (existing) {
                        existing.count += 1;
                      } else {
                        incompleteStageMap.set(label, { label, count: 1, stage: status.stage });
                      }
                    }
                  }
                  const incompleteStages = Array.from(incompleteStageMap.values()).sort((a, b) => b.stage - a.stage);

                  return (
                    <div
                      key={namaBlok}
                      className="space-y-2 lg:space-y-0"
                    >
                      {/* Mobile & Tablet Block Summary (< lg) */}
                      <div className="lg:hidden bg-white rounded-lg border border-sky-100 p-3 sm:p-3.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                              Blok: {namaBlok}
                            </h3>
                            <span className="text-xs text-slate-500 font-normal">
                              ({uniqueHouseholdCount} KK)
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-600">
                            Subtotal:{" "}
                            <span className="text-emerald-700 font-bold">
                              {formatIDR(blockTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Badges row below: green check-circle for Lunas, amber clock for incomplete stages */}
                        <div className="mt-2.5 pt-2 border-t border-sky-100/80 flex flex-wrap items-center gap-1.5">
                          {lunasCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                              <svg
                                className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>{lunasCount} Lunas</span>
                            </span>
                          )}
                          {incompleteStages.map((stage) => (
                            <span
                              key={stage.label}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0"
                            >
                              <svg
                                className="w-3.5 h-3.5 text-amber-600 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>{stage.count} {stage.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Mobile & Tablet family cards (< lg) */}
                      <div className="space-y-2 lg:hidden">
                        {sortRecordsByCumulativePaidDesc(blockRecords, residentTotals).map((item) => {
                          const rKey = getResidentKey(item);
                          const cumulative = residentTotals.get(rKey) || Number(item.amount || 0);
                          const duesStatus = calculateResidentDuesStatus(cumulative);

                          return (
                            <div
                              key={item.id}
                              className="bg-white rounded-lg border border-sky-100 p-2.5 sm:p-3 shadow-2xs hover:border-sky-200 transition-colors"
                            >
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 sm:gap-3">
                                {/* Section 1 (Left): house icon + Rumah {nomor_blok} then bold full household head name (wrap, never truncate) */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <svg
                                      className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                      />
                                    </svg>
                                    <span>Rumah {item.nomor_blok || "-"}</span>
                                  </div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug mt-0.5 break-words">
                                    {item.nama_kepala_keluarga || "-"}
                                  </div>
                                </div>

                                {/* Section 2 (Middle): subtle vertical divider, Iuran and full green amount */}
                                <div className="shrink-0 border-l border-slate-200/80 pl-2 sm:pl-3">
                                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block leading-tight">
                                    Iuran
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-emerald-700 block mt-0.5 whitespace-nowrap">
                                    {formatIDR(item.amount)}
                                  </span>
                                </div>

                                {/* Section 3 (Right): full pill status */}
                                <div className="shrink-0 flex items-center justify-end">
                                  {duesStatus.stage === 3 ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 whitespace-nowrap leading-none">
                                      <svg
                                        className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span>Tahap 3 &bull; Lunas</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 whitespace-nowrap leading-none">
                                      <svg
                                        className="w-3.5 h-3.5 text-amber-600 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span>{duesStatus.stageLabel}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop table view (>= lg) */}
                      <div className="hidden lg:block border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-900">
                              Blok: {namaBlok}
                            </h3>
                            <span className="text-xs text-slate-500">
                              ({uniqueHouseholdCount} KK)
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            Subtotal:{" "}
                            <span className="text-emerald-700 font-bold">
                              {formatIDR(blockTotal)}
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-700 min-w-[620px]">
                          <thead className="bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                              <th scope="col" className="py-2.5 px-4 w-12 text-center">
                                No
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Nomor Rumah
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Nama Kepala Keluarga
                              </th>
                              <th scope="col" className="py-2.5 px-4 text-right">
                                Jumlah Iuran
                              </th>
                              <th scope="col" className="py-2.5 px-4 text-center">
                                Tahap
                              </th>
                              <th scope="col" className="py-2.5 px-4 text-right">
                                Target
                              </th>
                              <th scope="col" className="py-2.5 px-4 text-right">
                                Sisa Tagihan
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortRecordsByCumulativePaidDesc(blockRecords, residentTotals).map((item, index) => {
                              const rKey = getResidentKey(item);
                              const cumulative = residentTotals.get(rKey) || Number(item.amount || 0);
                              const duesStatus = calculateResidentDuesStatus(cumulative);

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="py-2.5 px-4 text-center text-slate-400 text-xs font-mono">
                                    {index + 1}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600 font-medium">
                                    {item.nomor_blok}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-800 font-medium">
                                    {item.nama_kepala_keluarga || "-"}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                                    {formatIDR(item.amount)}
                                  </td>
                                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                        duesStatus.stage === 3
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : duesStatus.stage === 2
                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                          : duesStatus.stage === 1
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : "bg-slate-100 text-slate-600 border border-slate-200"
                                      }`}
                                    >
                                      {duesStatus.stageLabel}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-xs text-slate-600 font-medium">
                                    {formatIDR(duesStatus.target)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-medium text-xs whitespace-nowrap">
                                    {duesStatus.outstandingBalance > 0 ? (
                                      <span className="text-amber-700 font-semibold">
                                        {formatIDR(duesStatus.outstandingBalance)}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-700 font-semibold">
                                        Lunas (Rp0)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50/70 font-semibold text-xs border-t border-slate-200 text-slate-700">
                            <tr>
                              <td colSpan={3} className="py-2.5 px-4 text-right">
                                Subtotal Blok {namaBlok}:
                              </td>
                              <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                                {formatIDR(blockTotal)}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* Sumbangan & Apresiasi Warga (Kelebihan Pembayaran Iuran) */}
      {showDonations && (() => {
        const donations = calculateResidentExcessDonations(records);
        if (donations.length === 0) return null;

        const totalDonations = donations.reduce((sum, d) => sum + d.excessAmount, 0);

        return (
          <section
            aria-labelledby="donations-heading"
            className="bg-white rounded-xl border border-amber-200/90 shadow-2xs overflow-hidden mt-8"
          >
            <div className="p-3.5 sm:p-5 border-b border-amber-100 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 text-amber-700 shrink-0">
                    <svg
                      className="w-3.5 h-3.5 fill-amber-400 stroke-amber-600"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </span>
                  <h2 id="donations-heading" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Sumbangan &amp; Apresiasi Warga
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apresiasi dan terima kasih warga yang berpartisipasi sukarela melebihi target iuran wajib {formatIDR(DUES_TARGET)}
                </p>
              </div>
              <div className="inline-flex flex-wrap items-center justify-between sm:justify-start gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg border border-amber-300 bg-white/90 text-xs font-semibold text-slate-700 shadow-2xs self-start sm:self-auto shrink-0 max-w-full">
                <span className="text-slate-600">Total Sumbangan Sukarela:</span>
                <span className="text-amber-700 font-bold text-xs sm:text-sm whitespace-nowrap">
                  {formatIDR(totalDonations)}
                </span>
              </div>
            </div>

            {/* Mobile Dedicated Compact Cards (< md) */}
            <div className="p-3 sm:p-4 space-y-2.5 md:hidden bg-amber-50/10">
              {donations.map((donor, idx) => {
                const duesStatus = calculateResidentDuesStatus(donor.cumulativePaid);

                return (
                  <div
                    key={donor.residentKey}
                    className="bg-white rounded-lg border border-sky-100 p-3 shadow-2xs hover:border-sky-200 transition-colors"
                  >
                    {/* Header: Numbered badge + House/Unit + Status */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[11px] font-semibold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium min-w-0">
                          <svg
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                          <span className="min-w-0 break-words">
                            Blok {donor.namaBlok} No. {donor.nomorBlok}
                          </span>
                        </div>
                      </div>

                      {duesStatus.stage === 3 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shrink-0 whitespace-nowrap leading-none">
                          <svg
                            className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Lunas {formatIDR(DUES_TARGET)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 shrink-0 whitespace-nowrap leading-none">
                          <svg
                            className="w-3.5 h-3.5 text-amber-600 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{duesStatus.stageLabel}</span>
                        </span>
                      )}
                    </div>

                    {/* Resident full bold name */}
                    <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug mt-1.5 break-words">
                      {donor.namaKepalaKeluarga || "Warga"}
                    </div>

                    {/* Breakdown in compact readable rows, amounts never clipped */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 block leading-tight">
                          Total Bayar
                        </span>
                        <span className="font-semibold text-slate-700 block mt-0.5 break-words [overflow-wrap:anywhere]">
                          {formatIDR(donor.cumulativePaid)}
                        </span>
                      </div>
                      <div className="min-w-0 text-right">
                        <span className="text-[10px] uppercase font-medium tracking-wider text-amber-700 block leading-tight">
                          Sumbangan Sukarela
                        </span>
                        <span className="font-bold text-amber-700 block mt-0.5 break-words [overflow-wrap:anywhere]">
                          + {formatIDR(donor.excessAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Summary Total Card */}
              <div className="bg-amber-50/60 rounded-lg border border-amber-200/80 p-2.5 text-xs flex flex-wrap items-center justify-between gap-1.5 text-slate-700 font-semibold">
                <span className="min-w-0">Total Seluruh Sumbangan:</span>
                <span className="text-amber-800 font-bold text-sm text-right break-words [overflow-wrap:anywhere]">
                  {formatIDR(totalDonations)}
                </span>
              </div>
            </div>

            {/* Desktop & Tablet Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200/90 tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4 w-12 text-center">
                      No
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Warga &amp; Unit Rumah
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      Total Bayar
                    </th>
                    <th scope="col" className="py-3 px-4 text-center">
                      Iuran Wajib
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      Kelebihan (Sumbangan)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donations.map((donor, idx) => {
                    const duesStatus = calculateResidentDuesStatus(donor.cumulativePaid);

                    return (
                      <tr key={donor.residentKey} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 text-xs font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 min-w-0">
                          <span className="font-semibold text-slate-900 block break-words">
                            {donor.namaKepalaKeluarga || "Warga"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <svg
                              className="w-3.5 h-3.5 text-slate-400 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            <span>Blok {donor.namaBlok} No. {donor.nomorBlok}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {formatIDR(donor.cumulativePaid)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {duesStatus.stage === 3 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90">
                              <svg
                                className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>Lunas {formatIDR(DUES_TARGET)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/90">
                              <svg
                                className="w-3.5 h-3.5 text-amber-600 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>{duesStatus.stageLabel}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-700 whitespace-nowrap">
                          + {formatIDR(donor.excessAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-amber-50/40 font-semibold text-xs border-t border-amber-200/80 text-slate-700">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right text-slate-600">
                      Total Seluruh Sumbangan Warga:
                    </td>
                    <td className="py-3 px-4 text-right text-amber-800 font-bold text-sm whitespace-nowrap">
                      {formatIDR(totalDonations)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        );
      })()}

      {/* Public Expenses Disclosure Section */}
      {showExpenses && (
        <section aria-labelledby="expenses-heading" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-8">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 id="expenses-heading" className="text-base sm:text-lg font-bold text-slate-900">
                Daftar Pengeluaran Kas Lingkungan
              </h2>
              <p className="text-xs text-slate-500">
                Klik pada nominal untuk melihat tanggal dan rincian alokasi biaya
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
              Total Pengeluaran:{" "}
              <span className="text-rose-600 font-bold">
                {formatIDR(cashFlow.totalExpense)}
              </span>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                🧾
              </div>
              <h3 className="text-sm font-semibold text-slate-700">
                Belum ada catatan pengeluaran
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Semua pencatatan biaya dan pemakaian dana kas portal akan tampil di sini secara transparan.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map((expense, idx) => (
                <details
                  key={expense.id}
                  className="group transition-colors hover:bg-slate-50/70"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between p-4 sm:px-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 select-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 w-6 text-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-rose-600">
                        - {formatIDR(expense.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-700">
                      <span className="hidden sm:inline">Rincian</span>
                      <svg
                        className="w-4 h-4 transform transition-transform group-open:rotate-180 text-slate-400 group-hover:text-slate-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </summary>

                  <div className="px-4 sm:px-5 pb-4 pt-1 bg-slate-50/60 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">
                          Tanggal Pengeluaran
                        </span>
                        <span className="text-slate-800 font-medium mt-0.5 block">
                          {formatDateOnlyID(expense.date)}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">
                          Keterangan Alokasi
                        </span>
                        <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-line">
                          {expense.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function IuranSkeleton() {
  return (
    <>
      {/* Overview Stats Skeleton */}
      <section aria-label="Memuat Ringkasan Iuran" className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse">
            <div className="h-3 w-32 bg-slate-200 rounded"></div>
            <div className="mt-3 h-8 w-44 bg-slate-200 rounded"></div>
            <div className="mt-2 h-3 w-28 bg-slate-200 rounded"></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse">
            <div className="h-3 w-32 bg-slate-200 rounded"></div>
            <div className="mt-3 h-8 w-36 bg-slate-200 rounded"></div>
            <div className="mt-2 h-3 w-28 bg-slate-200 rounded"></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse">
            <div className="h-3 w-32 bg-slate-200 rounded"></div>
            <div className="mt-3 h-8 w-40 bg-slate-200 rounded"></div>
            <div className="mt-2 h-3 w-28 bg-slate-200 rounded"></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse">
            <div className="h-3 w-32 bg-slate-200 rounded"></div>
            <div className="mt-3 h-8 w-24 bg-slate-200 rounded"></div>
            <div className="mt-2 h-3 w-40 bg-slate-200 rounded"></div>
          </div>
        </div>
      </section>

      {/* Table Skeleton */}
      <section aria-label="Memuat Riwayat Iuran" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden animate-pulse">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 rounded"></div>
            <div className="h-3 w-64 bg-slate-200 rounded"></div>
          </div>
          <div className="h-9 w-44 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          <div className="h-4 bg-slate-200 rounded w-4/6"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
        </div>
      </section>
    </>
  );
}

function PaymentInfoSkeleton() {
  return (
    <section
      aria-label="Memuat Informasi Pembayaran"
      className="mb-8 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs animate-pulse"
    >
      <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
      <div className="h-6 w-56 bg-slate-200 rounded mb-2"></div>
      <div className="h-4 w-80 bg-slate-200 rounded mb-4"></div>
      <div className="h-10 w-full sm:w-96 bg-slate-200 rounded"></div>
    </section>
  );
}

async function PaymentInfoSection() {
  await connection();
  const configured = isSupabaseConfigured();
  const supabase = configured ? await getServerSupabase() : null;
  const activeTreasurers = await getActiveTreasurers(supabase);

  return (
    <section
      aria-labelledby="payment-info-heading"
      className="mb-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs"
    >
      {activeTreasurers.length > 0 && (
        <details className="group/outer">
          <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60">
                  Informasi Pembayaran
                </span>
                <h2
                  id="payment-info-heading"
                  className="mt-1.5 text-base sm:text-lg font-bold text-slate-900"
                >
                  Metode Penyaluran Iuran Warga
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Penyaluran dapat dilakukan secara tunai ke pengurus atau transfer via QRIS bendahara.
                </p>
              </div>

              <div className="w-full sm:w-auto inline-flex items-center justify-between gap-2.5 px-5 py-2.5 min-h-[44px] text-sm sm:text-base font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 shrink-0 text-emerald-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Bayar Iuran</span>
                </span>
                <span className="text-xs font-medium text-emerald-100 flex items-center gap-1">
                  <span className="group-open/outer:hidden">Pilih Bendahara</span>
                  <span className="hidden group-open/outer:inline">Tutup</span>
                  <svg
                    className="w-4 h-4 transition-transform duration-200 group-open/outer:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </summary>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-xs sm:text-sm text-slate-500">
              Bayar melalui bendahara berikut. Buka salah satu nama untuk melihat QRIS atau kirim bukti.
            </p>

            <div className="space-y-2">
              {activeTreasurers.map((treasurer) => {
                const waUrl = formatWhatsAppUrl(treasurer.wa_number);

                return (
                  <details
                    key={treasurer.id}
                    className="group rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden open:border-emerald-500 open:ring-1 open:ring-emerald-500/30"
                  >
                    <summary className="flex items-center justify-between gap-3 p-3.5 sm:p-4 cursor-pointer select-none hover:bg-slate-50/70 transition-colors list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 min-h-[48px]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                            {treasurer.name}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50 shrink-0">
                            Bendahara
                          </span>
                        </div>
                        {treasurer.wa_number && (
                          <p className="mt-0.5 text-xs text-slate-500 font-mono">
                            WA: <span className="font-medium text-slate-700">{treasurer.wa_number}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 group-open:text-emerald-700 shrink-0">
                        <span className="font-medium hidden sm:inline group-open:hidden">
                          QRIS &amp; Kontak
                        </span>
                        <span className="font-medium hidden group-open:sm:inline">
                          Tutup
                        </span>
                        <svg
                          className="w-4 h-4 transition-transform duration-200 group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </summary>

                    <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 flex flex-col items-center text-center">
                      {treasurer.qris_image_url ? (
                        <>
                          <div className="mt-2 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={treasurer.qris_image_url}
                              alt={`Kode QRIS Pembayaran ${treasurer.name}`}
                              className="w-56 sm:w-64 max-h-80 object-contain mx-auto rounded-lg"
                              loading="lazy"
                            />
                          </div>

                          <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-800">
                            QRIS {treasurer.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 max-w-sm">
                            Pindai kode QRIS menggunakan mobile banking atau e-wallet.
                          </p>

                          <div className="mt-2">
                            <a
                              href={treasurer.qris_image_url}
                              download={`qris-${treasurer.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`}
                              className="inline-flex items-center gap-1.5 py-1 px-2.5 min-h-[36px] text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                            >
                              <svg
                                className="w-3.5 h-3.5 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              <span>Unduh Gambar QRIS</span>
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 w-full max-w-sm">
                          Kode QRIS belum diunggah untuk bendahara ini. Silakan hubungi nomor WhatsApp di bawah untuk konfirmasi.
                        </div>
                      )}

                      {/* Tombol Kirim Bukti Pembayaran */}
                      <div className="mt-4 pt-3 border-t border-slate-100 w-full flex flex-col sm:flex-row items-center justify-center gap-2">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                          >
                            <svg
                              className="w-4 h-4 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <span>Kirim Bukti Pembayaran via WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Nomor WhatsApp belum tersedia untuk konfirmasi bukti pembayaran.
                          </span>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </details>
      )}

      {activeTreasurers.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60">
              Informasi Pembayaran
            </span>
            <h2
              id="payment-info-heading"
              className="mt-1.5 text-base sm:text-lg font-bold text-slate-900"
            >
              Metode Penyaluran Iuran Warga
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Penyaluran dapat dilakukan secara tunai ke pengurus atau transfer via QRIS bendahara.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function GalleryPreviewSkeleton() {
  return (
    <section
      aria-label="Memuat Galeri Foto Lingkungan"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-8 animate-pulse"
    >
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded"></div>
          <div className="h-5 w-48 bg-slate-200 rounded"></div>
          <div className="h-3 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
      </div>
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="aspect-[4/3] bg-slate-200"></div>
            <div className="p-3.5 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
              <div className="h-3 w-full bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ponytail: Direct server component query fetching limited preview items (6 photos) wrapped in Suspense. Full gallery at /galeri.
async function GalleryPreviewSection() {
  const configured = isSupabaseConfigured();
  let items: PublicGalleryItem[] = [];

  if (configured) {
    const supabase = await getServerSupabase();
    if (supabase) {
      items = await getPublicGalleryItems(supabase, "all", 6);
    }
  }

  return (
    <section
      aria-labelledby="gallery-preview-heading"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-8"
    >
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60">
            Dokumentasi Lingkungan
          </span>
          <h2 id="gallery-preview-heading" className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Galeri Foto Kerja Bakti &amp; Hasil
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasi transparansi kegiatan gotong royong dan realisasi portal warga
          </p>
        </div>
        <Link
          href="/galeri"
          className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[40px] text-xs sm:text-sm font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 self-start sm:self-auto shrink-0"
        >
          <span>Lihat lebih banyak</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl mb-3">
            📷
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-800">
            Belum Ada Foto Dokumentasi
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Dokumentasi kerja bakti dan hasil pengadaan portal belum diunggah oleh pengurus.
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="group bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                <Link
                  href="/galeri"
                  className="relative aspect-[4/3] bg-slate-100 overflow-hidden block focus-visible:outline-2 focus-visible:outline-emerald-600"
                  aria-label={`Lihat foto ${item.title} di galeri lengkap`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    {item.category === "kegiatan" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100/90 text-sky-800 backdrop-blur-xs ring-1 ring-sky-300/50 shadow-2xs">
                        Kegiatan
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100/90 text-emerald-800 backdrop-blur-xs ring-1 ring-emerald-300/50 shadow-2xs">
                        Hasil
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      href="/galeri"
                      className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 block"
                    >
                      {item.title}
                    </Link>
                    {item.caption && (
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {item.caption}
                      </p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <time dateTime={item.created_at}>{formatDateOnlyID(item.created_at)}</time>
                    <Link
                      href="/galeri"
                      className="text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
                    >
                      <span>Buka Galeri</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/galeri"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs sm:text-sm font-semibold rounded-lg text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-2xs"
            >
              <span>Lihat lebih banyak</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
              IP
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                Iuran Portal Lingkungan
              </h1>
              <p className="text-xs text-slate-500 truncate">
                Transparansi Dana Swadaya Warga
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/galeri"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shrink-0"
            >
              <span>Galeri Foto</span>
            </Link>
            <Link
              href="/pengurus"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[44px] text-xs sm:text-sm font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shrink-0"
            >
              <span>Area Pengurus</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {!configured && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <h2 className="font-semibold text-base text-amber-950">
                  Konfigurasi Supabase Belum Terpasang
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  Aplikasi belum terhubung dengan database Supabase. Silakan buat
                  berkas <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code>{" "}
                  dari referensi <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">.env.example</code>{" "}
                  dan terapkan skema database di{" "}
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">supabase/schema.sql</code>{" "}
                  sesuai panduan di <strong className="font-semibold">README.md</strong>.
                </p>
                <p className="mt-2 text-xs text-amber-700">
                  <em>Catatan: Mode tanpa database tidak menggunakan penyimpanan lokal tiruan (no fake mock persistence).</em>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informasi Pembayaran & QRIS */}
        <Suspense fallback={<PaymentInfoSkeleton />}>
          <PaymentInfoSection />
        </Suspense>

        <Suspense fallback={<IuranSkeleton />}>
          <IuranContent />
        </Suspense>

        <Suspense fallback={<GalleryPreviewSkeleton />}>
          <GalleryPreviewSection />
        </Suspense>


        <footer className="mt-12 text-center text-xs text-slate-400 pb-8">
          Sistem Informasi Iuran Swadaya Warga &bull; Next.js + Supabase
        </footer>
      </main>
    </div>
  );
}
