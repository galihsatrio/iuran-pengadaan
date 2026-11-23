"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createTreasurerAction, type ActionResult } from "../actions";
import { compressImage } from "@/lib/compress-image";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function CreateTreasurerForm() {
  const [state, formAction, isPending] = useActionState(
    createTreasurerAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const qrisInputRef = useRef<HTMLInputElement>(null);
  const isReadyToSubmitRef = useRef(false);
  const [isCompressing, setIsCompressing] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isReadyToSubmitRef.current) {
      isReadyToSubmitRef.current = false;
      return;
    }

    const file = qrisInputRef.current?.files?.[0];
    if (!file) {
      return;
    }

    e.preventDefault();
    setIsCompressing(true);

    try {
      const compressed = await compressImage(file, 1024, 0.9);
      const newName = file.name.includes(".")
        ? file.name.replace(/\.[^.]+$/, ".jpg")
        : `${file.name}.jpg`;
      const compressedFile = new File([compressed], newName, {
        type: "image/jpeg",
      });

      const dt = new DataTransfer();
      dt.items.add(compressedFile);
      if (qrisInputRef.current) {
        qrisInputRef.current.files = dt.files;
      }
    } catch {
      // compression failed — submit original
    } finally {
      setIsCompressing(false);
    }

    isReadyToSubmitRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Tambah Master Bendahara Baru
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Lengkapi nama, nomor WhatsApp narahubung, dan berkas kode QRIS. Banyak bendahara dapat berstatus aktif bersamaan.
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
                href="/pengurus/master-bendahara"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline text-xs"
              >
                &larr; Kembali ke Daftar Master Bendahara
              </Link>
            </div>
          )}
        </div>
      )}

      <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-5">
        {/* Nama Bendahara */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Nama Bendahara <span className="text-rose-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="Contoh: Bpk. Ahmad Subarjo"
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.name
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          {state.errors?.name && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.name}</p>
          )}
        </div>

        {/* WhatsApp */}
        <div>
          <label
            htmlFor="wa_number"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Nomor WhatsApp <span className="text-rose-500">*</span>
          </label>
          <input
            id="wa_number"
            name="wa_number"
            type="text"
            required
            maxLength={20}
            placeholder="Contoh: 081234567890"
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.wa_number
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Digunakan warga untuk konfirmasi pembayaran via WhatsApp.
          </p>
          {state.errors?.wa_number && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.wa_number}</p>
          )}
        </div>

        {/* Status Aktif */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              value="true"
              defaultChecked={true}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                Status Aktif
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Jika dicentang, bendahara beserta QRIS akan ditampilkan kepada warga di halaman publik.
              </span>
            </div>
          </label>
        </div>

        {/* Berkas QRIS */}
        <div>
          <label
            htmlFor="qris_image"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
          >
            Unggah Berkas QRIS (Opsional)
          </label>
          <input
            ref={qrisInputRef}
            id="qris_image"
            name="qris_image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isPending || isCompressing}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-white"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Format: PNG, JPG, WEBP. Gambar akan dikompresi otomatis sebelum diunggah. (Pengguna iPhone: pilih dari Galeri, bukan kamera langsung)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Link
            href="/pengurus/master-bendahara"
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] justify-center inline-flex items-center text-xs sm:text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending || isCompressing}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] justify-center inline-flex items-center text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 cursor-pointer"
          >
            {isCompressing
              ? "Memproses foto..."
              : isPending
              ? "Menyimpan..."
              : "Simpan Bendahara"}
          </button>
        </div>
      </form>
    </div>
  );
}
