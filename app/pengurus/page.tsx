import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatIDR } from "@/lib/format";
import {
  calculateResidentTotals,
  calculateResidentDuesStatus,
  getResidentKey,
  sortRecordsByCumulativePaidDesc,
} from "@/lib/dues";
import ContributionForm from "./contribution-form";
import IuranRowActions from "./row-actions";
import { LogoutButton } from "./logout-button";

import type { IuranRecord } from "@/lib/types";

export const instant = false;

// ponytail: Pengurus dashboard enforcing allowlist verification on both page render and RLS DB insert.
export default async function PengurusPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-slate-900">
            Konfigurasi Supabase Belum Terpasang
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pengaturan Supabase diperlukan untuk mengakses area pengurus. Silakan
            atur variabel lingkungan terlebih dahulu.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Kembali ke Rekap Warga
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cek apakah user ada dalam daftar pengurus_allowlist
  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-rose-200 shadow-sm text-center">
          <div className="text-3xl mb-3">🚫</div>
          <h1 className="text-lg font-bold text-slate-900">
            Akses Ditolak (Bukan Pengurus)
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Akun <strong>{user.email}</strong> berhasil masuk, namun ID Anda (
            <code className="bg-slate-100 text-xs px-1 py-0.5 rounded font-mono">
              {user.id}
            </code>
            ) belum terdaftar dalam tabel <code className="text-xs font-mono font-semibold">pengurus_allowlist</code>.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Sesuai kebijakan keamanan, hanya ID yang secara eksplisit didaftarkan
            di database yang berhak mencatat iuran warga.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Lihat Rekap Publik
            </Link>
            <LogoutButton variant="card" />
          </div>
        </div>
      </div>
    );
  }

  // Ambil daftar iuran
  let iuranData: IuranRecord[] | null = null;
  const { data: fullData, error: fullError } = await supabase
    .from("iuran")
    .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, is_key_collected, key_collected_at, created_at")
    .order("created_at", { ascending: false });

  if (fullError && (fullError.code === "42703" || fullError.message.includes("column"))) {
    // Fallback if is_key_collected column does not exist yet in remote DB
    const { data: fallbackData } = await supabase
      .from("iuran")
      .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, created_at")
      .order("created_at", { ascending: false });
    iuranData = fallbackData as IuranRecord[] | null;
  } else {
    iuranData = fullData as IuranRecord[] | null;
  }

  const records = (iuranData as IuranRecord[]) || [];
  const totalAmount = records.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Form Section */}
        <section aria-labelledby="form-heading">
          <ContributionForm />
        </section>

        {/* Recap Table for Pengurus */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Data Iuran Terkumpul ({records.length})
              </h2>
              <p className="text-xs text-slate-500">
                Total keseluruhan saat ini:{" "}
                <span className="font-semibold text-emerald-700">
                  {formatIDR(totalAmount)}
                </span>
              </p>
            </div>

            <a
              href="/api/export-xlsx"
              download="rekap-iuran-portal.xlsx"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors min-h-[44px] sm:min-h-0"
            >
              <span>Unduh Excel (.xlsx)</span>
            </a>
          </div>

          {records.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500 text-sm">
              Belum ada data iuran yang dicatat. Gunakan form di atas untuk
              mencatat iuran warga.
            </div>
          ) : (() => {
            const residentTotals = calculateResidentTotals(records);

            return (
              <div className="p-4 sm:p-6 space-y-6">
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

                    return (
                      <div
                        key={namaBlok}
                        className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
                      >
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-900">
                              Blok: {namaBlok}
                            </h3>
                            <span className="text-xs text-slate-500">
                              ({blockRecords.length} catatan)
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
                          <table className="w-full text-left text-sm text-slate-700 min-w-[760px]">
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
                                <th scope="col" className="py-2.5 px-4 text-center w-20">
                                  Opsi
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sortRecordsByCumulativePaidDesc(blockRecords, residentTotals).map((item, index) => {
                                const rKey = getResidentKey(item);
                                const cumulative = residentTotals.get(rKey) || Number(item.amount || 0);
                                const duesStatus = calculateResidentDuesStatus(cumulative);
                                const isEligibleForKey = cumulative >= 75000;

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
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span>{item.nama_kepala_keluarga || "-"}</span>
                                        {isEligibleForKey && (
                                          <Link
                                            href="/pengurus/pengambilan-kunci"
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 w-fit hover:bg-emerald-200 transition-colors"
                                            title="Kelola pengambilan kunci di menu Pengambilan Kunci"
                                          >
                                            <svg className="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                            Bisa Ambil Kunci
                                          </Link>
                                        )}
                                      </div>
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
                                    <td className="py-2.5 px-4 text-center">
                                      <IuranRowActions
                                        record={item}
                                        isEligibleForKey={isEligibleForKey}
                                      />
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
                                <td colSpan={4}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })()}
        </section>
      </main>
  );
}
