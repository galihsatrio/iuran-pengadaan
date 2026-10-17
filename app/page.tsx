import Link from "next/link";
import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatIDR, formatDateID } from "@/lib/format";
import type { IuranRecord } from "@/lib/types";

// ponytail: Direct server component query wrapped in Suspense for instant static shell streaming. Upgrade to pagination if records exceed 200 items.
async function IuranContent() {
  const configured = isSupabaseConfigured();

  let records: IuranRecord[] = [];
  let errorMessage: string | null = null;
  let totalAmount = 0;

  if (configured) {
    const supabase = await getServerSupabase();
    if (supabase) {
      // Public warga query: only requested public fields, no secret/auth fields
      const { data, error } = await supabase
        .from("iuran")
        .select("id, nama_blok, nomor_blok, amount, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        errorMessage = error.message;
      } else if (data) {
        records = data as IuranRecord[];
        totalAmount = records.reduce(
          (sum, r) => sum + Number(r.amount || 0),
          0
        );
      }
    }
  }

  return (
    <>
      {/* Overview Stats */}
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">
          Ringkasan Iuran
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Dana Terkumpul
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {formatIDR(totalAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Dari {records.length} catatan iuran warga
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Partisipasi
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-800">
              {records.length} <span className="text-base font-medium text-slate-500">Warga</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pengadaan dan pemasangan portal otomatis
            </p>
          </div>
        </div>
      </section>

      {/* Table & Actions */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Daftar Riwayat Iuran Warga
            </h2>
            <p className="text-xs text-slate-500">
              Catatan transparan kontribusi swadaya warga
            </p>
          </div>

          <div>
            <a
              href="/api/export-xlsx"
              download="rekap-iuran-portal.xlsx"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Unduh Rekap Excel (.xlsx)</span>
            </a>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="py-3 px-4 w-12 text-center">
                    No
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Nama Blok
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Nomor Blok
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Jumlah Iuran
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Waktu Pencatatan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 text-xs font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.nama_blok}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.nomor_blok}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatIDR(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">
                      {formatDateID(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right text-slate-700">
                    Total Terkumpul:
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    {formatIDR(totalAmount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function IuranSkeleton() {
  return (
    <>
      {/* Overview Stats Skeleton */}
      <section aria-label="Memuat Ringkasan Iuran" className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse">
            <div className="h-3 w-32 bg-slate-200 rounded"></div>
            <div className="mt-3 h-8 w-44 bg-slate-200 rounded"></div>
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

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              IP
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Iuran Portal Lingkungan
              </h1>
              <p className="text-xs text-slate-500">
                Transparansi Dana Swadaya Warga
              </p>
            </div>
          </div>
          <Link
            href="/pengurus"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <span>Area Pengurus</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
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

        <Suspense fallback={<IuranSkeleton />}>
          <IuranContent />
        </Suspense>

        <footer className="mt-12 text-center text-xs text-slate-400 pb-8">
          Sistem Informasi Iuran Swadaya Warga &bull; Next.js + Supabase
        </footer>
      </main>
    </div>
  );
}
