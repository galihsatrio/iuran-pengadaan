"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createExpenseAction, type ActionResult } from "../actions";
import { formatIDR } from "@/lib/format";

const initialState: ActionResult = {
  success: false,
  message: "",
};

interface FormItem {
  id: string;
  description: string;
  amount: string;
}

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

  const [items, setItems] = useState<FormItem[]>([
    { id: "item-1", description: "", amount: "" },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: "",
        amount: "",
      },
    ]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDescriptionChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, description: val } : item))
    );
  };

  const handleAmountChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, amount: val } : item))
    );
  };

  const handleResetForm = () => {
    setItems([{ id: `item-${Date.now()}`, description: "", amount: "" }]);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const totalCalculated = items.reduce((sum, it) => {
    const num = Number(it.amount);
    return sum + (!isNaN(num) && Number.isInteger(num) && num > 0 ? num : 0);
  }, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs max-w-3xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Catat Pengeluaran Baru
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Catat belanja material/keperluan kas dalam satu formulir. Anda dapat mengelompokkan ke pengadaan tertentu (contoh: Portal Utama) dengan beberapa rincian item sekaligus.
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
          <div className="font-semibold">{state.message}</div>
          {state.success ? (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link
                href="/pengurus/pengeluaran"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline text-xs"
              >
                &larr; Lihat Daftar Pengeluaran
              </Link>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-semibold text-emerald-900 hover:underline cursor-pointer"
              >
                + Catat Pengeluaran Baru Lainnya
              </button>
            </div>
          ) : null}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-6">
        {/* Kelompok Pengadaan & Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Contoh: Portal Utama
              </span>
            </div>
            <input
              id="procurement_group"
              name="procurement_group"
              type="text"
              list="procurement-group-suggestions"
              maxLength={100}
              placeholder="Pilih dari daftar atau ketik baru"
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
              <p className="mt-1 text-[11px] text-slate-500">
                Kosongkan bila pengeluaran mandiri / tanpa nama pengadaan.
              </p>
            )}
          </div>

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
        </div>

        {/* Dynamic Material Rows Section */}
        <div className="border border-slate-200 rounded-xl p-3.5 sm:p-5 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Rincian Bahan &amp; Kebutuhan Biaya <span className="text-rose-500">*</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tiap baris dicatat sebagai item pengeluaran terpisah di bawah kelompok yang sama.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isPending}
              className="self-start sm:self-auto min-h-[38px] px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Baris Bahan
            </button>
          </div>

          {state.errors?.items && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {state.errors.items}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => {
              const descError = state.errors?.[`items.${idx}.description`];
              const amountError = state.errors?.[`items.${idx}.amount`];
              const hasError = Boolean(descError || amountError);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border bg-white transition-colors ${
                    hasError
                      ? "border-rose-300 ring-1 ring-rose-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                    {/* Index Badge */}
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>

                    {/* Deskripsi Keperluan / Bahan */}
                    <div className="flex-1 w-full min-w-0">
                      <label htmlFor={`item_desc_${idx}`} className="sr-only">
                        Keterangan Bahan {idx + 1}
                      </label>
                      <input
                        id={`item_desc_${idx}`}
                        name="item_description"
                        type="text"
                        required
                        maxLength={255}
                        placeholder={
                          idx === 0
                            ? "Contoh: Besi Hollow 4x4 (5 meter)"
                            : idx === 1
                            ? "Contoh: Jasa Las portal"
                            : "Keterangan bahan / keperluan"
                        }
                        value={item.description}
                        onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                        disabled={isPending}
                        className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                          descError
                            ? "border-rose-300 bg-rose-50/50"
                            : "border-slate-300"
                        }`}
                      />
                    </div>

                    {/* Nominal */}
                    <div className="w-full sm:w-48 shrink-0">
                      <label htmlFor={`item_amt_${idx}`} className="sr-only">
                        Nominal Bahan {idx + 1} (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          Rp
                        </span>
                        <input
                          id={`item_amt_${idx}`}
                          name="item_amount"
                          type="number"
                          required
                          min={1}
                          step={1}
                          inputMode="numeric"
                          placeholder="0"
                          value={item.amount}
                          onChange={(e) => handleAmountChange(idx, e.target.value)}
                          disabled={isPending}
                          className={`w-full rounded-lg border pl-9 pr-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                            amountError
                              ? "border-rose-300 bg-rose-50/50"
                              : "border-slate-300"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Hapus Baris Button */}
                    <div className="shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1 || isPending}
                        aria-label={`Hapus baris ${idx + 1}`}
                        title={items.length <= 1 ? "Minimal 1 baris pengeluaran" : "Hapus baris ini"}
                        className={`min-h-[44px] min-w-[44px] px-2.5 py-2 inline-flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                          items.length <= 1
                            ? "text-slate-300 cursor-not-allowed"
                            : "text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span className="sm:hidden ml-1 text-xs">Hapus</span>
                      </button>
                    </div>
                  </div>

                  {/* Individual Row Errors */}
                  {(descError || amountError) && (
                    <div className="mt-2 text-xs text-rose-600 space-y-0.5 pl-0 sm:pl-8">
                      {descError && <p>{descError}</p>}
                      {amountError && <p>{amountError}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Subtotal & Row Counter */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Total {items.length} rincian material
            </span>
            <div className="text-xs sm:text-sm font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
              Total Biaya Formulir:{" "}
              <span className="text-emerald-700 font-bold">
                {formatIDR(totalCalculated)}
              </span>
            </div>
          </div>
        </div>

        {/* Bukti Foto Kuitansi (Optional, Private, Shared for Batch) */}
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
            Format: PNG, JPG, atau WEBP. Maksimal 2MB. Foto nota ini otomatis terlampir untuk seluruh rincian belanja di atas dan hanya dapat dilihat oleh pengurus terdaftar.
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
            {isPending ? "Menyimpan..." : `Simpan Pengeluaran (${items.length} Item)`}
          </button>
        </div>
      </form>
    </div>
  );
}
