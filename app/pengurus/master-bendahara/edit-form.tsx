"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateTreasurerAction, type ActionResult } from "../actions";
import QrisPreviewToggle from "@/components/qris-preview";
import type { Treasurer } from "@/lib/types";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function EditTreasurerForm({
  treasurer,
}: {
  treasurer: Treasurer;
}) {
  const updateActionWithId = updateTreasurerAction.bind(null, treasurer.id);
  const [state, formAction, isPending] = useActionState(
    updateActionWithId,
    initialState
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
      <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Edit Data Bendahara
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Perbarui nama, WhatsApp, status aktif, atau ganti gambar QRIS.
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold self-start sm:self-center ${
            treasurer.is_active
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          {treasurer.is_active ? "Status: Aktif" : "Status: Nonaktif"}
        </span>
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

      <form action={formAction} className="space-y-5">
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
            defaultValue={treasurer.name}
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
            defaultValue={treasurer.wa_number}
            disabled={isPending}
            className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
              state.errors?.wa_number
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-300"
            }`}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Warga akan menghubungi nomor ini saat melakukan konfirmasi pembayaran.
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
              defaultChecked={treasurer.is_active}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                Status Aktif
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Banyak bendahara dapat aktif bersamaan. Jika aktif, kontak dan QRIS tampil di portal warga.
              </span>
            </div>
          </label>
        </div>

        {/* Current QRIS status & Upload Replacement */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="qris_image"
              className="block text-xs sm:text-sm font-semibold text-slate-700"
            >
              Berkas QRIS
            </label>
            {treasurer.qris_image_url && (
              <div className="shrink-0">
                <QrisPreviewToggle
                  imageUrl={treasurer.qris_image_url}
                  name={`QRIS ${treasurer.name}`}
                  buttonLabel="Lihat QRIS Saat Ini"
                />
              </div>
            )}
          </div>
          <input
            id="qris_image"
            name="qris_image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isPending}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-white"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            {treasurer.qris_image_url
              ? "Pilih berkas baru jika ingin mengganti gambar QRIS saat ini. Maksimal 2MB (PNG, JPG, WEBP)."
              : "Unggah berkas QRIS bendahara ini jika ada. Maksimal 2MB (PNG, JPG, WEBP)."}
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
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] justify-center inline-flex items-center text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
