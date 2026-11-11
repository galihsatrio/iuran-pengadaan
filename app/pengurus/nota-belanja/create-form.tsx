"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { createShoppingNoteAction, type ActionResult } from "../actions";
import { formatIDR } from "@/lib/format";

const initialState: ActionResult = {
  success: false,
  message: "",
};

interface FormItem {
  id: string;
  name: string;
  price: string;
}

export default function CreateShoppingNoteForm() {
  const [state, formAction, isPending] = useActionState(
    createShoppingNoteAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().split("T")[0];

  const [items, setItems] = useState<FormItem[]>([
    { id: "item-1", name: "", price: "" },
  ]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        price: "",
      },
    ]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleNameChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: val } : item))
    );
  };

  const handlePriceChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, price: val } : item))
    );
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleResetForm = () => {
    setItems([{ id: `item-${Date.now()}`, name: "", price: "" }]);
    setPreviewUrl(null);
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const totalCalculated = items.reduce((sum, it) => {
    const num = Number(it.price);
    return sum + (!isNaN(num) && Number.isInteger(num) && num >= 0 ? num : 0);
  }, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs max-w-3xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Catat Nota Belanja Baru
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Unggah 1 foto nota/struk belanja beserta rincian nama barang dan harga untuk disimpan sebagai arsip dokumen belanja.
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
                href="/pengurus/nota-belanja"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline text-xs"
              >
                &larr; Lihat Daftar Nota Belanja
              </Link>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-semibold text-emerald-900 hover:underline cursor-pointer"
              >
                + Catat Nota Lainnya
              </button>
            </div>
          ) : null}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-6">
        {/* Judul & Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="title"
              className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
            >
              Judul Nota <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={100}
              placeholder="Contoh: Belanja Cat & Kuas Portal"
              disabled={isPending}
              className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                state.errors?.title ? "border-rose-300 bg-rose-50/50" : "border-slate-300"
              }`}
            />
            {state.errors?.title && (
              <p className="mt-1 text-xs text-rose-600">{state.errors.title}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
            >
              Tanggal Belanja <span className="text-rose-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={today}
              disabled={isPending}
              className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                state.errors?.date ? "border-rose-300 bg-rose-50/50" : "border-slate-300"
              }`}
            />
            {state.errors?.date && (
              <p className="mt-1 text-xs text-rose-600">{state.errors.date}</p>
            )}
          </div>
        </div>

        {/* Dynamic Items List */}
        <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Rincian Barang Belanja
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan setiap item barang dan harganya sesuai struk belanja.
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
              Tambah Baris Barang
            </button>
          </div>

          {state.errors?.items && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {state.errors.items}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => {
              const nameError = state.errors?.[`items.${idx}.item_name`];
              const priceError = state.errors?.[`items.${idx}.item_price`];
              const hasError = Boolean(nameError || priceError);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border bg-white transition-colors ${
                    hasError ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                    {/* Index Badge */}
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>

                    {/* Nama Barang */}
                    <div className="flex-1 w-full min-w-0">
                      <label htmlFor={`item_name_${idx}`} className="sr-only">
                        Nama Barang {idx + 1}
                      </label>
                      <input
                        id={`item_name_${idx}`}
                        name="item_name"
                        type="text"
                        required
                        maxLength={200}
                        placeholder={
                          idx === 0
                            ? "Contoh: Semen Gresik 40kg"
                            : idx === 1
                            ? "Contoh: Pasir cor 1 karung"
                            : "Nama barang"
                        }
                        value={item.name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        disabled={isPending}
                        className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                          nameError ? "border-rose-300 bg-rose-50/50" : "border-slate-300"
                        }`}
                      />
                    </div>

                    {/* Harga */}
                    <div className="w-full sm:w-44 shrink-0">
                      <label htmlFor={`item_price_${idx}`} className="sr-only">
                        Harga Barang {idx + 1}
                      </label>
                      <div className="relative rounded-lg">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-semibold text-slate-400">
                          Rp
                        </span>
                        <input
                          id={`item_price_${idx}`}
                          name="item_price"
                          type="number"
                          required
                          min="0"
                          step="1"
                          placeholder="0"
                          value={item.price}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          disabled={isPending}
                          className={`w-full rounded-lg border pl-9 pr-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                            priceError ? "border-rose-300 bg-rose-50/50" : "border-slate-300"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Hapus Baris */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={isPending}
                        title="Hapus baris ini"
                        className="self-end sm:self-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        aria-label={`Hapus baris barang ke-${idx + 1}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Per-item errors */}
                  {(nameError || priceError) && (
                    <div className="mt-2 text-xs text-rose-600 pl-8 space-y-0.5">
                      {nameError && <p>{nameError}</p>}
                      {priceError && <p>{priceError}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Subtotal Footer */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="text-xs sm:text-sm font-semibold text-emerald-900">
              Total Belanja ({items.length} item):
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-700">
              {formatIDR(totalCalculated)}
            </span>
          </div>
        </div>

        {/* Upload Foto Struk */}
        <div>
          <label
            htmlFor="photo"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Foto Struk / Nota Belanja{" "}
            <span className="text-xs font-normal text-slate-400">(Opsional, PNG, JPG, atau WEBP, maks 5MB)</span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoChange}
            disabled={isPending}
            className="block w-full text-xs sm:text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer transition-colors border border-slate-300 rounded-lg p-1.5"
          />

          {previewUrl && (
            <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-200 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview struk belanja"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Pratinjau Foto</p>
                <p className="text-slate-400">Foto akan diunggah bersama nota saat disimpan.</p>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
          <Link
            href="/pengurus/nota-belanja"
            className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] inline-flex items-center justify-center text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Menyimpan Nota...</span>
              </>
            ) : (
              <span>Simpan Nota Belanja</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
