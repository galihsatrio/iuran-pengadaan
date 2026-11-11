import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getShoppingNoteById, getShoppingNoteSignedUrl } from "@/lib/shopping-notes";
import { formatIDR, formatDateOnlyID } from "@/lib/format";
import ReceiptPreview from "@/components/receipt-preview";
import DeleteNoteButton from "../delete-note-button";

export const instant = false;

interface ShoppingNoteDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShoppingNoteDetailPage({ params }: ShoppingNoteDetailPageProps) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isSafeInteger(numId) || numId <= 0) {
    notFound();
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-slate-900">
            Konfigurasi Supabase Belum Terpasang
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pengaturan Supabase diperlukan untuk mengakses area pengurus.
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
            Akun <strong>{user.email}</strong> belum terdaftar dalam tabel{" "}
            <code className="text-xs font-mono font-semibold">pengurus_allowlist</code>.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Kembali ke Rekap Publik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const note = await getShoppingNoteById(numId, supabase);
  if (!note) {
    notFound();
  }

  let signedPhotoUrl: string | null = null;
  if (note.photo_path) {
    signedPhotoUrl = await getShoppingNoteSignedUrl(supabase, note.photo_path, 300);
  }

  const items = note.items || [];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back Link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/pengurus/nota-belanja"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Daftar Nota
        </Link>

        <div className="flex items-center gap-2">
          <DeleteNoteButton id={note.id} title={note.title} />
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-slate-400">
                Nota #{note.id} &bull; {formatDateOnlyID(note.date)}
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {note.title}
              </h1>
            </div>
            <div className="sm:text-right">
              <span className="text-xs text-slate-500 block">Total Belanja</span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
                {formatIDR(note.total_amount)}
              </span>
            </div>
          </div>

          {/* Photo Section if exists */}
          {signedPhotoUrl && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Foto Struk / Nota Terlampir</span>
              </div>
              <ReceiptPreview
                signedUrl={signedPhotoUrl}
                description={`Foto Nota: ${note.title}`}
                buttonLabel="Lihat Foto Struk / Nota"
              />
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="p-5 sm:p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3">
            Rincian Barang ({items.length} item)
          </h2>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th scope="col" className="px-4 py-2.5 w-12 text-center">No</th>
                  <th scope="col" className="px-4 py-2.5">Nama Barang</th>
                  <th scope="col" className="px-4 py-2.5 text-right w-44">Harga Satuan / Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">
                      Tidak ada rincian item.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {item.item_name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900 whitespace-nowrap">
                        {formatIDR(item.item_price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs sm:text-sm">
                  <td colSpan={2} className="px-4 py-3 text-slate-900">
                    Total Keseluruhan
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                    {formatIDR(note.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
