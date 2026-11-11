"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { updateShoppingNoteAction, type ActionResult } from "../actions";
import { formatIDR } from "@/lib/format";
import type { ShoppingNote } from "@/lib/types";

const initialState: ActionResult = {
  success: false,
  message: "",
};

interface FormItem {
  id: string;
  name: string;
  price: string;
}

interface EditShoppingNoteFormProps {
  note: ShoppingNote;
  signedPhotoUrl?: string | null;
}

export default function EditShoppingNoteForm({
  note,
  signedPhotoUrl = null,
}: EditShoppingNoteFormProps) {
  const updateActionWithId = updateShoppingNoteAction.bind(null, note.id);
  const [state, formAction, isPending] = useActionState(
    updateActionWithId,
    initialState
  );

  const [items, setItems] = useState<FormItem[]>(() => {
    if (note.items && note.items.length > 0) {
      return note.items.map((it) => ({
        id: `item-${it.id}`,
        name: it.item_name,
        price: String(it.item_price),
      }));
    }
    return [{ id: "item-1", name: "", price: "" }];
  });

  const [removePhoto, setRemovePhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const totalCalculated = items.reduce((sum, it) => {
    const num = Number(it.price);
    return sum + (!isNaN(num) && Number.isInteger(num) && num >= 0 ? num : 0);
  }, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs max-w-3xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href={`/pengurus/nota-belanja/${note.id}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Detail Nota
        </Link>
      </div>

      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Ubah Data Nota Belanja
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perbarui judul, tanggal belanja, rincian barang, atau foto struk nota belanja.
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
                href={`/pengurus/nota-belanja/${note.id}`}
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline text-xs"
              >
                &larr; Lihat Detail Nota
              </Link>
              <Link
                href="/pengurus/nota-belanja"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline text-xs"
              >
                Daftar Nota Belanja
              </Link>
            </div>
          ) : null}
        </div>
      )}

      <form action={formAction} className="space-y-6">
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
              defaultValue={note.title}
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
              defaultValue={note.date}
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

        {/* Bukti Foto Nota */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label
            htmlFor="photo"
            className="block text-xs sm:text-sm font-semibold text-slate-700"
          >
            Foto Struk / Nota Belanja
          </label>

          {signedPhotoUrl && !removePhoto && (
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signedPhotoUrl}
                  alt="Foto Nota Saat Ini"
                  className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    Foto Struk / Nota Tersimpan
                  </span>
                  <a
                    href={signedPhotoUrl}
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
                  name="remove_photo"
                  value="true"
                  checked={removePhoto}
                  onChange={(e) => setRemovePhoto(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Hapus berkas foto ini</span>
              </label>
            </div>
          )}

          {removePhoto && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 flex items-center justify-between gap-2 text-xs text-rose-800">
              <span>Foto nota akan dihapus saat formulir disimpan.</span>
              <button
                type="button"
                onClick={() => setRemovePhoto(false)}
                className="font-semibold underline cursor-pointer"
              >
                Batalkan Hapus
              </button>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-600 block mb-1">
              {signedPhotoUrl && !removePhoto
                ? "Unggah foto baru untuk mengganti berkas saat ini:"
                : "Unggah foto nota (opsional):"}
            </span>
            <input
              ref={fileInputRef}
              id="photo"
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              disabled={isPending}
              className="block w-full text-xs sm:text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer transition-colors border border-slate-300 rounded-lg p-1.5"
            />
            <p className="mt-1 text-xs text-slate-500">
              Format: PNG, JPG, atau WEBP. Maksimal 5MB.
            </p>

            {previewUrl && (
              <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-200 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview foto baru"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Pratinjau Foto Baru</p>
                  <p className="text-slate-400">
                    Foto ini akan menggantikan foto lama saat disimpan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
          <Link
            href={`/pengurus/nota-belanja/${note.id}`}
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
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
