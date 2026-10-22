"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateExpenseAction, type ActionResult } from "../actions";
import type { ExpenseRecord } from "@/lib/types";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function EditExpenseForm({
  expense,
  signedReceiptUrl,
  existingGroups = [],
}: {
  expense: ExpenseRecord;
  signedReceiptUrl: string | null;
  existingGroups?: string[];
}) {
  const updateActionWithId = updateExpenseAction.bind(null, expense.id);
  const [state, formAction, isPending] = useActionState(
    updateActionWithId,
    initialState
  );
  const [removeReceipt, setRemoveReceipt] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Ubah Data Pengeluaran
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perbarui tanggal, keterangan keperluan, nominal, atau berkas kuitansi.
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

      <form action={formAction} className="space-y-5">
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
            defaultValue={expense.date}
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
            defaultValue={expense.description}
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
            defaultValue={expense.amount}
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
            list="procurement-group-suggestions-edit"
            maxLength={100}
            defaultValue={expense.procurement_group ?? ""}
            placeholder="Pilih dari daftar atau ketik baru (kosongkan jika tanpa kelompok)"
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.procurement_group
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          {existingGroups.length > 0 && (
            <datalist id="procurement-group-suggestions-edit">
              {existingGroups.map((grp) => (
                <option key={grp} value={grp} />
              ))}
            </datalist>
          )}
          {state.errors?.procurement_group ? (
            <p className="mt-1 text-xs text-rose-600">{state.errors.procurement_group}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Ubah atau tetapkan kelompok hasil pengadaan untuk item ini.
            </p>
          )}
        </div>

        {/* Bukti Foto Kuitansi */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label
            htmlFor="receipt"
            className="block text-xs sm:text-sm font-semibold text-slate-700"
          >
            Foto Kuitansi / Bukti Nota
          </label>

          {signedReceiptUrl && !removeReceipt && (
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signedReceiptUrl}
                  alt="Kuitansi Saat Ini"
                  className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    Berkas Kuitansi Tersimpan
                  </span>
                  <a
                    href={signedReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Lihat Ukuran Penuh</span>
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-rose-700 hover:text-rose-800 cursor-pointer self-start sm:self-center">
                <input
                  type="checkbox"
                  name="remove_receipt"
                  value="true"
                  checked={removeReceipt}
                  onChange={(e) => setRemoveReceipt(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Hapus berkas foto ini</span>
              </label>
            </div>
          )}

          {removeReceipt && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 flex items-center justify-between gap-2 text-xs text-rose-800">
              <span>Foto kuitansi akan dihapus saat formulir disimpan.</span>
              <button
                type="button"
                onClick={() => setRemoveReceipt(false)}
                className="font-semibold underline cursor-pointer"
              >
                Batalkan Hapus
              </button>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-600 block mb-1">
              {signedReceiptUrl ? "Unggah foto baru untuk mengganti berkas saat ini:" : "Unggah foto kuitansi:"}
            </span>
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={isPending}
              className="w-full text-xs sm:text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
            <p className="mt-1 text-xs text-slate-500">
              Format: PNG, JPG, atau WEBP. Maksimal 2MB. Penyimpanan privat pengurus.
            </p>
          </div>
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
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
