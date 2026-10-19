"use client";

import { useState, useTransition } from "react";
import { deleteExpenseAction } from "../actions";

export default function DeleteExpenseButton({
  id,
  description,
}: {
  id: number;
  description: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteExpenseAction(id);
      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setIsConfirming(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg
          className="w-3.5 h-3.5 text-rose-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span>Hapus</span>
      </button>

      {isConfirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Hapus Pengeluaran"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => !isPending && setIsConfirming(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Hapus Catatan Pengeluaran?
            </h3>
            <p className="mt-1.5 text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus catatan &ldquo;
              <strong className="text-slate-800">{description}</strong>&rdquo;? Berkas
              kuitansi terkait juga akan dihapus.
            </p>

            {errorMessage && (
              <div className="mt-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isPending}
                className="px-3 py-2 min-h-[36px] text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-3.5 py-2 min-h-[36px] text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
