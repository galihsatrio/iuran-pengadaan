"use client";

import { useActionState, useRef, useEffect } from "react";
import { uploadQrisAction, type ActionResult } from "./actions";
import QrisPreviewToggle from "@/components/qris-preview";
import type { PaymentSettings } from "@/lib/types";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function QrisUploadSection({
  initialSettings,
}: {
  initialSettings: PaymentSettings;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadQrisAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  const hasQris = Boolean(initialSettings.qris_image_url);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pengaturan Metode Pembayaran & QRIS
            </h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                hasQris
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {hasQris ? "QRIS Aktif" : "Belum Ada QRIS"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola gambar QRIS untuk kemudahan warga menyalurkan iuran secara digital.
          </p>
        </div>

        {hasQris && initialSettings.qris_image_url && (
          <div className="shrink-0">
            <QrisPreviewToggle
              imageUrl={initialSettings.qris_image_url}
              name={initialSettings.qris_name}
              buttonLabel="Preview QRIS"
            />
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {state.message && (
        <div
          role="alert"
          className={`mt-4 p-3.5 rounded-lg text-xs sm:text-sm ${
            state.success
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Upload Form */}
      <form
        ref={formRef}
        action={formAction}
        className="mt-4 pt-2 flex flex-col sm:flex-row sm:items-end gap-3"
      >
        <div className="flex-1">
          <label
            htmlFor="qris_image"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Unggah Berkas Gambar QRIS Baru
          </label>
          <input
            id="qris_image"
            name="qris_image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            disabled={isPending}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-white"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Format yang didukung: PNG, JPG, WEBP. Ukuran maksimal 2MB.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isPending ? "Mengunggah..." : hasQris ? "Ganti Gambar QRIS" : "Unggah QRIS"}
        </button>
      </form>
    </div>
  );
}
