"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { createIuranRecord, type ActionResult } from "./actions";
import { formatIDR } from "@/lib/format";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function ContributionForm() {
  const [state, formAction, isPending] = useActionState(
    createIuranRecord,
    initialState
  );

  const [rawAmount, setRawAmount] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form upon successful submission
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setRawAmount("");
    }
  }, [state.success, state.message]);

  const numAmount = Number(rawAmount);
  const showPreview = !isNaN(numAmount) && numAmount > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-lg font-bold text-slate-900">
          Catat Iuran Warga Baru
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Hanya isi Nama Blok, Nomor Blok, dan Jumlah Uang.
        </p>
      </div>

      {state.message && (
        <div
          role="alert"
          className={`mb-5 p-4 rounded-lg text-sm ${
            state.success
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {state.message}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Input 1: Nama Blok */}
          <div>
            <label
              htmlFor="nama_blok"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Nama Blok <span className="text-rose-500">*</span>
            </label>
            <input
              id="nama_blok"
              name="nama_blok"
              type="text"
              required
              maxLength={50}
              placeholder="Contoh: Blok A"
              disabled={isPending}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                state.errors?.nama_blok
                  ? "border-rose-300 bg-rose-50/50"
                  : "border-slate-300"
              }`}
            />
            {state.errors?.nama_blok && (
              <p className="mt-1 text-xs text-rose-600">
                {state.errors.nama_blok}
              </p>
            )}
          </div>

          {/* Input 2: Nomor Blok */}
          <div>
            <label
              htmlFor="nomor_blok"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Nomor Blok / Rumah <span className="text-rose-500">*</span>
            </label>
            <input
              id="nomor_blok"
              name="nomor_blok"
              type="text"
              required
              maxLength={20}
              placeholder="Contoh: 12 atau 05B"
              disabled={isPending}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                state.errors?.nomor_blok
                  ? "border-rose-300 bg-rose-50/50"
                  : "border-slate-300"
              }`}
            />
            {state.errors?.nomor_blok && (
              <p className="mt-1 text-xs text-rose-600">
                {state.errors.nomor_blok}
              </p>
            )}
          </div>
        </div>

        {/* Input 3: Amount IDR */}
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Jumlah Iuran (Rp) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm font-medium">
              Rp
            </span>
            <input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step={1}
              required
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              placeholder="50000"
              disabled={isPending}
              className={`w-full rounded-lg border pl-10 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                state.errors?.amount
                  ? "border-rose-300 bg-rose-50/50"
                  : "border-slate-300"
              }`}
            />
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {showPreview ? (
                <span className="text-emerald-700 font-medium">
                  Terbilang: {formatIDR(numAmount)}
                </span>
              ) : (
                "Masukkan angka tanpa titik atau koma."
              )}
            </span>
            <span>Min: Rp 1 &bull; Maks: Rp 1.000.000.000</span>
          </div>

          {state.errors?.amount && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.amount}</p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Menyimpan Catatan..." : "Simpan Catatan Iuran"}
          </button>
        </div>
      </form>
    </div>
  );
}
