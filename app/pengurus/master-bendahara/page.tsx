import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAllTreasurers } from "@/lib/treasurers";
import { LogoutButton } from "../logout-button";
import QrisPreviewToggle from "@/components/qris-preview";

export const instant = false;

// ponytail: Master bendahara list page supporting multiple active treasurers with navigation to create and edit pages.
export default async function MasterBendaharaPage() {
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
            di database yang berhak mengelola data pengurus.
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

  const treasurers = await getAllTreasurers(supabase);
  const activeCount = treasurers.filter((t) => t.is_active).length;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Daftar Master Bendahara
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeCount} Aktif / {treasurers.length} Total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola data bendahara dan kode QRIS. Mendukung banyak bendahara aktif secara bersamaan untuk kemudahan pembayaran warga.
            </p>
          </div>

          <Link
            href="/pengurus/master-bendahara/tambah"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Tambah Bendahara Baru</span>
          </Link>
        </div>

        {/* Treasurers Table / List */}
        <section aria-label="Tabel Master Bendahara" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {treasurers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                Belum ada data bendahara yang terdaftar.
              </p>
              <Link
                href="/pengurus/master-bendahara/tambah"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                + Tambah Bendahara Pertama
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700 min-w-[620px]">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="py-3 px-4 w-12 text-center">
                      No
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Nama Bendahara
                    </th>
                    <th scope="col" className="py-3 px-4">
                      Nomor WhatsApp
                    </th>
                    <th scope="col" className="py-3 px-4 text-center">
                      QRIS
                    </th>
                    <th scope="col" className="py-3 px-4 text-center">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 text-center w-28">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {treasurers.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 text-xs font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.wa_number ? (
                          <a
                            href={`https://wa.me/${item.wa_number.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <span>{item.wa_number}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.qris_image_url ? (
                          <div className="inline-block">
                            <QrisPreviewToggle
                              imageUrl={item.qris_image_url}
                              name={`QRIS ${item.name}`}
                              buttonLabel="Lihat QRIS"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Belum Ada
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/pengurus/master-bendahara/${item.id}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span>Edit</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
  );
}
