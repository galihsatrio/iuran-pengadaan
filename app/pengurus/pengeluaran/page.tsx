import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAllExpenses, getExpenseReceiptSignedUrl, groupExpensesByProcurement } from "@/lib/expenses";
import { formatIDR, formatDateOnlyID } from "@/lib/format";
import { LogoutButton } from "../logout-button";
import { PengurusNavLink } from "../nav-link";
import ReceiptPreview from "@/components/receipt-preview";
import DeleteExpenseButton from "./delete-expense-button";

export const instant = false;

// ponytail: Pengurus expense management page enforcing allowlist on both page render and RLS.
export default async function PengurusPengeluaranPage() {
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

  const rawExpenses = await getAllExpenses(supabase);
  const totalAmount = rawExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Generate signed URLs server-side for expenses that have receipt_path
  const expenses = await Promise.all(
    rawExpenses.map(async (item) => {
      let signedReceiptUrl: string | null = null;
      if (item.receipt_path) {
        signedReceiptUrl = await getExpenseReceiptSignedUrl(supabase, item.receipt_path, 300);
      }
      return {
        ...item,
        signedReceiptUrl,
      };
    })
  );

  const groupedExpenses = groupExpensesByProcurement(expenses);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
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
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[130px] sm:max-w-xs">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              Tampilan Publik
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Navigation Subheader / Breadcrumb Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
          <PengurusNavLink
            href="/pengurus"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Data Iuran Warga
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/master-bendahara"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Master Bendahara &amp; QRIS
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/pengeluaran"
            isActive
            className="py-3 border-b-2 border-emerald-600 text-emerald-700 font-semibold shrink-0 min-h-[44px]"
          >
            Pengeluaran Kas
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/galeri"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Galeri Kegiatan
          </PengurusNavLink>
          <PengurusNavLink
            href="/pengurus/pengaturan"
            className="py-3 border-b-2 border-transparent text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px]"
          >
            Pengaturan
          </PengurusNavLink>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pencatatan Pengeluaran Kas
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                {expenses.length} Catatan
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Total Pengeluaran:{" "}
              <strong className="text-rose-600 font-bold">
                {formatIDR(totalAmount)}
              </strong>
            </p>
          </div>

          <Link
            href="/pengurus/pengeluaran/tambah"
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
            <span>Catat Pengeluaran Baru</span>
          </Link>
        </div>

        {expenses.length === 0 ? (
          <section aria-label="Tabel Catatan Pengeluaran" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                🧾
              </div>
              <h3 className="text-sm font-semibold text-slate-700">
                Belum ada catatan pengeluaran
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Catatan operasional dan bukti kuitansi yang dibuat pengurus akan tersimpan dan tampil di sini.
              </p>
              <div className="mt-4">
                <Link
                  href="/pengurus/pengeluaran/tambah"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  + Catat Pengeluaran Pertama
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            {groupedExpenses.map((grp) => (
              <section
                key={grp.isUngrouped ? "__ungrouped__" : grp.groupName}
                aria-label={`Pengeluaran ${grp.groupName}`}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Procurement Group Heading */}
                <div className="p-4 sm:px-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        grp.isUngrouped ? "bg-slate-400" : "bg-emerald-500"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words min-w-0 leading-snug">
                        {grp.groupName}
                      </h3>
                      <p className="text-xs text-slate-500 font-normal">
                        {grp.items.length} item pengeluaran
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs sm:text-sm font-extrabold text-rose-600 whitespace-nowrap">
                      Subtotal: {formatIDR(grp.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Table of items for this procurement */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 min-w-[560px]">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="py-3 px-4 w-12 text-center">
                          No
                        </th>
                        <th scope="col" className="py-3 px-4">
                          Tanggal
                        </th>
                        <th scope="col" className="py-3 px-4">
                          Keterangan
                        </th>
                        <th scope="col" className="py-3 px-4 text-right">
                          Nominal
                        </th>
                        <th scope="col" className="py-3 px-4 text-center">
                          Bukti Foto
                        </th>
                        <th scope="col" className="py-3 px-4 text-center w-36">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grp.items.map((item, index) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 text-center text-slate-400 text-xs font-mono">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                            {formatDateOnlyID(item.date)}
                          </td>
                          <td className="py-3 px-4 text-slate-900 font-medium break-words min-w-0">
                            {item.description}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-600 whitespace-nowrap">
                            - {formatIDR(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.signedReceiptUrl ? (
                              <ReceiptPreview
                                signedUrl={item.signedReceiptUrl}
                                description={`Bukti: ${item.description}`}
                              />
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Tanpa Foto
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/pengurus/pengeluaran/${item.id}`}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
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
                                <span>Ubah</span>
                              </Link>
                              <DeleteExpenseButton
                                id={item.id}
                                description={item.description}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
