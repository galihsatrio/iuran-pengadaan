"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { createExpenseAction, type ActionResult } from "../actions";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function CreateExpenseForm({
  existingGroups = [],
}: {
  existingGroups?: string[];
}) {
  const [state, formAction, isPending] = useActionState(
    createExpenseAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Catat Pengeluaran Baru
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Masukkan tanggal, rincian keperluan, nominal, dan lampiran foto kuitansi/nota jika tersedia.
        </p>
      </div>

      {state.message && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-lg text-xs sm:text-sm ${
            state.success
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {state.message}
          {state.success && (
            <div className="mt-3">
              <Link
                href="/pengurus/pengeluaran"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline text-xs"
              >
                &larr; Kembali ke Daftar Pengeluaran
              </Link>
            </div>
          )}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-5">
        {/* Tanggal */}
        <div>
          <label
            htmlFor="date"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Tanggal Pengeluaran <span className="text-rose-500">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={today}
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.date
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          {state.errors?.date && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.date}</p>
          )}
        </div>

        {/* Keterangan */}
        <div>
          <label
            htmlFor="description"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Keterangan / Keperluan <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            maxLength={255}
            rows={3}
            placeholder="Contoh: Pembelian semen, pasir, dan cat marka jalan untuk pondasi portal"
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.description
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          {state.errors?.description && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.description}</p>
          )}
        </div>

        {/* Nominal */}
        <div>
          <label
            htmlFor="amount"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Nominal Pengeluaran (Rp) <span className="text-rose-500">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min={1}
            step={1}
            placeholder="Contoh: 150000"
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.amount
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          {state.errors?.amount && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.amount}</p>
          )}
        </div>

        {/* Kelompok Pengadaan */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="procurement_group"
              className="block text-xs sm:text-sm font-semibold text-slate-700"
            >
              Kelompok Pengadaan (Opsional)
            </label>
            <span className="text-[11px] text-slate-500">
              Contoh: Portal Utama, CCTV
            </span>
          </div>
          <input
            id="procurement_group"
            name="procurement_group"
            type="text"
            list="procurement-group-suggestions"
            maxLength={100}
            placeholder="Pilih dari daftar atau ketik baru (kosongkan jika tanpa kelompok)"
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.procurement_group
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          {existingGroups.length > 0 && (
            <datalist id="procurement-group-suggestions">
              {existingGroups.map((grp) => (
                <option key={grp} value={grp} />
              ))}
            </datalist>
          )}
          {state.errors?.procurement_group ? (
            <p className="mt-1 text-xs text-rose-600">{state.errors.procurement_group}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Kelompokkan biaya pengadaan agar rekap belanja bahan rapi (misal: Portal Utama, CCTV). Kosongkan untuk masuk &ldquo;Belum dikelompokkan&rdquo;.
            </p>
          )}
        </div>

        {/* Bukti Foto Kuitansi (Optional, Private) */}
        <div>
          <label
            htmlFor="receipt"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Foto Kuitansi / Nota Pembelian (Opsional)
          </label>
          <input
            id="receipt"
            name="receipt"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isPending}
            className="w-full text-xs sm:text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          <p className="mt-1 text-xs text-slate-500">
            Format: PNG, JPG, atau WEBP. Maksimal 2MB. Berkas tersimpan di penyimpanan privat dan hanya dapat dilihat oleh pengurus terdaftar.
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            href="/pengurus/pengeluaran"
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center text-xs sm:text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
          </button>
        </div>
      </form>
    </div>
  );
}
