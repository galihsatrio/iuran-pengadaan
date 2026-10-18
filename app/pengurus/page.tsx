import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatIDR, formatDateID } from "@/lib/format";
import { getPaymentSettings } from "@/lib/payment-settings";
import ContributionForm from "./contribution-form";
import IuranRowActions from "./row-actions";
import QrisUploadSection from "./qris-upload-section";
import { logoutAction } from "./actions";

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
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Ambil daftar iuran
  const { data: iuranData } = await supabase
    .from("iuran")
    .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, created_at")
    .order("created_at", { ascending: false });

  const records = (iuranData as IuranRecord[]) || [];
  const totalAmount = records.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const paymentSettings = await getPaymentSettings(supabase);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Pengurus Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              IP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none">
                  Portal Pengurus
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Allowlisted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
            >
              Tampilan Publik
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* QRIS & Payment Settings Section */}
        <section aria-label="Pengaturan QRIS Pembayaran">
          <QrisUploadSection initialSettings={paymentSettings} />
        </section>

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
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <span>Unduh Excel (.xlsx)</span>
            </a>
          </div>

          {records.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500 text-sm">
              Belum ada data iuran yang dicatat. Gunakan form di atas untuk
              mencatat iuran warga.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="py-2.5 px-4 w-12 text-center">
                      No
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      Nama Blok
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      Nomor Blok
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      Nama Kepala Keluarga
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-right">
                      Jumlah Iuran
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-right">
                      Waktu Dicatat
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-center w-20">
                      Opsi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-center text-slate-400 text-xs font-mono">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {item.nama_blok}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {item.nomor_blok}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 font-medium">
                        {item.nama_kepala_keluarga || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                        {formatIDR(item.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-slate-500">
                        {formatDateID(item.created_at)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <IuranRowActions record={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
