"use client";

import { useActionState, useRef, useEffect } from "react";
import { uploadQrisAction, updateBendaharaAction, type ActionResult } from "./actions";
import QrisPreviewToggle from "@/components/qris-preview";
import type { PaymentSettings } from "@/lib/types";

const initialUploadState: ActionResult = {
  success: false,
  message: "",
};

const initialBendaharaState: ActionResult = {
  success: false,
  message: "",
};

export default function QrisUploadSection({
  initialSettings,
}: {
  initialSettings: PaymentSettings;
}) {
  const [uploadState, uploadFormAction, isUploadPending] = useActionState(
    uploadQrisAction,
    initialUploadState
  );
  const [bendaharaState, bendaharaFormAction, isBendaharaPending] = useActionState(
    updateBendaharaAction,
    initialBendaharaState
  );
  const uploadFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (uploadState.success && uploadFormRef.current) {
      uploadFormRef.current.reset();
    }
  }, [uploadState.success]);

  const hasQris = Boolean(initialSettings.qris_image_url);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pengaturan Master Bendahara & QRIS
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
            Kelola data bendahara dan gambar QRIS untuk kemudahan warga menyalurkan iuran.
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

      {/* Sub-form 1: Data Master Bendahara */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Kontak & Informasi Bendahara
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Nama dan nomor WhatsApp bendahara yang ditampilkan sebagai narahubung warga.
        </p>

        {bendaharaState.message && (
          <div
            role="alert"
            className={`mb-4 p-3.5 rounded-lg text-xs sm:text-sm ${
              bendaharaState.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {bendaharaState.message}
          </div>
        )}

        <form action={bendaharaFormAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nama_bendahara"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nama Bendahara
              </label>
              <input
                id="nama_bendahara"
                name="nama_bendahara"
                type="text"
                defaultValue={initialSettings.nama_bendahara || ""}
                placeholder="Contoh: Bpk. Ahmad Subarjo"
                disabled={isBendaharaPending}
                maxLength={100}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {bendaharaState.errors?.nama_bendahara && (
                <p className="mt-1 text-xs text-rose-600">
                  {bendaharaState.errors.nama_bendahara}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="no_wa_bendahara"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                No. WhatsApp Bendahara
              </label>
              <input
                id="no_wa_bendahara"
                name="no_wa_bendahara"
                type="text"
                defaultValue={initialSettings.no_wa_bendahara || ""}
                placeholder="Contoh: 081234567890"
                disabled={isBendaharaPending}
                maxLength={20}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              />
              {bendaharaState.errors?.no_wa_bendahara && (
                <p className="mt-1 text-xs text-rose-600">
                  {bendaharaState.errors.no_wa_bendahara}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isBendaharaPending}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] justify-center inline-flex items-center text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 cursor-pointer"
            >
              {isBendaharaPending ? "Menyimpan..." : "Simpan Data Bendahara"}
            </button>
          </div>
        </form>
      </div>

      <hr className="border-slate-100" />

      {/* Sub-form 2: Unggah Gambar QRIS */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Gambar Kode QRIS
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Unggah atau perbarui gambar QRIS resmi paguyuban untuk pembayaran warga.
        </p>

        {uploadState.message && (
          <div
            role="alert"
            className={`mb-4 p-3.5 rounded-lg text-xs sm:text-sm ${
              uploadState.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {uploadState.message}
          </div>
        )}

        <form
          ref={uploadFormRef}
          action={uploadFormAction}
          className="flex flex-col sm:flex-row sm:items-end gap-3"
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
              disabled={isUploadPending}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-white"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Format yang didukung: PNG, JPG, WEBP. Ukuran maksimal 2MB.
            </p>
          </div>

          <button
            type="submit"
            disabled={isUploadPending}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] justify-center inline-flex items-center text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isUploadPending
              ? "Mengunggah..."
              : hasQris
              ? "Ganti Gambar QRIS"
              : "Unggah QRIS"}
          </button>
        </form>
      </div>
    </div>
  );
}
