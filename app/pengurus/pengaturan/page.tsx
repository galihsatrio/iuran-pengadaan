import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPaymentSettings } from "@/lib/payment-settings";
import { LogoutButton } from "../logout-button";
import SettingsForm from "./settings-form";

export const instant = false;

// ponytail: Pengurus settings page enforcing allowlist on both page render and RLS DB update.
export default async function PengurusPengaturanPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-slate-900">
            Konfigurasi Supabase Belum Terpasang
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pengaturan Supabase diperlukan untuk mengakses area pengurus. Silakan atur variabel lingkungan terlebih dahulu.
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
            Akun <strong>{user.email}</strong> berhasil masuk, namun ID Anda belum terdaftar dalam tabel <code className="text-xs font-mono font-semibold">pengurus_allowlist</code>.
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

  const settings = await getPaymentSettings(supabase);
  const showExpenses = settings.show_expenses_on_home ?? true;
  const showDonations = settings.show_donations_on_home ?? true;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Pengaturan Portal &amp; Tampilan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi visibilitas informasi dan preferensi tampilan portal warga.
          </p>
        </div>

        <section aria-labelledby="settings-form-heading">
          <SettingsForm
            initialShowExpenses={showExpenses}
            initialShowDonations={showDonations}
          />
        </section>
      </main>
  );
}
