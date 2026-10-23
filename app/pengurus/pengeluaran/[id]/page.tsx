import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getExpenseById, getExpenseReceiptSignedUrl, getAllExpenses } from "@/lib/expenses";
import { LogoutButton } from "../../logout-button";
import EditExpenseForm from "../edit-form";

export const instant = false;

interface EditExpensePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
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
            Akun <strong>{user.email}</strong> belum terdaftar dalam tabel <code className="text-xs font-mono font-semibold">pengurus_allowlist</code>.
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

  const expense = await getExpenseById(numId, supabase);
  if (!expense) {
    notFound();
  }

  let signedReceiptUrl: string | null = null;
  if (expense.receipt_path) {
    signedReceiptUrl = await getExpenseReceiptSignedUrl(supabase, expense.receipt_path, 300);
  }

  const allExpenses = await getAllExpenses(supabase);
  const existingGroups = Array.from(
    new Set(
      allExpenses
        .map((e) => (typeof e.procurement_group === "string" ? e.procurement_group.trim() : ""))
        .filter((g): g is string => g.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "id"));

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
              href="/pengurus/pengeluaran"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              &larr; Batal &amp; Kembali
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Navigation Subheader / Breadcrumb */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/pengurus/pengeluaran" className="hover:text-emerald-700 hover:underline">
            Pengeluaran Kas
          </Link>
          <span>&gt;</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs">
            Edit Pengeluaran #{expense.id}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <EditExpenseForm
          expense={expense}
          signedReceiptUrl={signedReceiptUrl}
          existingGroups={existingGroups}
        />
      </main>
    </div>
  );
}
