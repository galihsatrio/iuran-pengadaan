"use client";

import { useActionState } from "react";
import { updateHomeVisibilitySettingsAction, type ActionResult } from "../actions";

interface SettingsFormProps {
  initialShowExpenses: boolean;
  initialShowDonations?: boolean;
}

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function SettingsForm({
  initialShowExpenses,
  initialShowDonations = true,
}: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateHomeVisibilitySettingsAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            state.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span className="text-lg" aria-hidden="true">
            {state.success ? "✓" : "⚠️"}
          </span>
          <div className="flex-1">
            <p className="font-semibold">
              {state.success ? "Pengaturan Disimpan" : "Gagal Menyimpan"}
            </p>
            <p className="mt-0.5 text-xs opacity-90">{state.message}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tampilan Halaman Utama (Beranda)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Atur visibilitas ringkasan pengeluaran kas dan daftar apresiasi sumbangan sukarela warga di halaman depan.
          </p>
        </div>

        {/* Pengaturan Pengeluaran */}
        <div className="pt-4 border-t border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1 pr-2">
            <label
              htmlFor="show_expenses_on_home"
              className="text-sm font-semibold text-slate-800 cursor-pointer select-none"
            >
              Tampilkan pengeluaran di beranda
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jika dinonaktifkan, rincian daftar pengeluaran serta kartu total pengeluaran dan saldo bersih kas akan disembunyikan dari pengunjung publik di beranda.
            </p>
          </div>

          <div className="flex items-center shrink-0 pt-0.5">
            <input
              type="hidden"
              name="show_expenses_on_home"
              value="false"
            />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="show_expenses_on_home"
                type="checkbox"
                name="show_expenses_on_home"
                value="true"
                defaultChecked={initialShowExpenses}
                disabled={isPending}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Pengaturan Sumbangan & Apresiasi Warga */}
        <div className="pt-4 border-t border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1 pr-2">
            <label
              htmlFor="show_donations_on_home"
              className="text-sm font-semibold text-slate-800 cursor-pointer select-none"
            >
              Tampilkan section sumbangan &amp; apresiasi warga
            </label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jika dinonaktifkan, tabel dan ringkasan &ldquo;Sumbangan &amp; Apresiasi Warga&rdquo; (kelebihan pembayaran melebihi target iuran wajib Rp75.000) disembunyikan dari beranda publik.
            </p>
          </div>

          <div className="flex items-center shrink-0 pt-0.5">
            <input
              type="hidden"
              name="show_donations_on_home"
              value="false"
            />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="show_donations_on_home"
                type="checkbox"
                name="show_donations_on_home"
                value="true"
                defaultChecked={initialShowDonations}
                disabled={isPending}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Pengaturan</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
