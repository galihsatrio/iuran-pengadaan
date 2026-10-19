"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { createIuranRecord, type ActionResult } from "./actions";

const initialState: ActionResult = {
  success: false,
  message: "",
};

// ponytail: Native <dialog> modal matches existing edit form pattern in row-actions.tsx.
export default function ContributionForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createIuranRecord,
    initialState
  );

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Focus restore & dialog visibility management
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Handle successful creation: reset form and close dialog after short feedback
  useEffect(() => {
    if (state.success && isOpen) {
      if (formRef.current) {
        formRef.current.reset();
      }
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [state.success, isOpen]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Catatan Iuran Warga
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catat pembayaran iuran baru dari warga perumahan.
          </p>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Catat Iuran Baru</span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setIsOpen(false);
        }}
        aria-labelledby="create-dialog-title"
        className="fixed inset-0 m-auto p-0 rounded-xl border border-slate-200 shadow-xl max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto bg-white text-slate-900 backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs z-50"
      >
        <div className="p-6 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3
                id="create-dialog-title"
                className="text-base font-bold text-slate-900"
              >
                Catat Iuran Warga Baru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi blok, rumah, nama kepala keluarga, dan jumlah iuran.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-2 -mr-1.5 min-h-[36px] min-w-[36px] inline-flex items-center justify-center cursor-pointer"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>

          {state.message && (
            <div
              role="alert"
              className={`mt-4 p-3 rounded-lg text-xs ${
                state.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {state.message}
            </div>
          )}

          <form ref={formRef} action={formAction} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="create_nama_blok"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nama Blok <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create_nama_blok"
                  name="nama_blok"
                  type="text"
                  required
                  maxLength={50}
                  placeholder="Contoh: Blok A"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
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

              <div>
                <label
                  htmlFor="create_nomor_blok"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nomor Blok / Rumah <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create_nomor_blok"
                  name="nomor_blok"
                  type="text"
                  required
                  maxLength={20}
                  placeholder="Contoh: 12 atau 05B"
                  disabled={isPending}
                  className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
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

            <div>
              <label
                htmlFor="create_nama_kepala_keluarga"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nama Kepala Keluarga <span className="text-rose-500">*</span>
              </label>
              <input
                id="create_nama_kepala_keluarga"
                name="nama_kepala_keluarga"
                type="text"
                required
                maxLength={100}
                placeholder="Contoh: Bpk. Bambang Pamungkas"
                disabled={isPending}
                className={`w-full rounded-lg border px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors ${
                  state.errors?.nama_kepala_keluarga
                    ? "border-rose-300 bg-rose-50/50"
                    : "border-slate-300"
                }`}
              />
              {state.errors?.nama_kepala_keluarga && (
                <p className="mt-1 text-xs text-rose-600">
                  {state.errors.nama_kepala_keluarga}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="create_amount"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Jumlah Iuran (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                id="create_amount"
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                placeholder="Contoh: 50000"
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

            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-full sm:w-auto py-2.5 px-4 min-h-[44px] justify-center inline-flex items-center text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto py-2.5 px-4 min-h-[44px] justify-center inline-flex items-center text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Menyimpan..." : "Simpan Catatan Iuran"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
