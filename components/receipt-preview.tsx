"use client";

import { useState } from "react";

interface ReceiptPreviewProps {
  signedUrl: string;
  description?: string;
  buttonLabel?: string;
}

export default function ReceiptPreview({
  signedUrl,
  description = "Bukti Kuitansi",
  buttonLabel = "Lihat Bukti",
}: ReceiptPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
      >
        <svg
          className="w-3.5 h-3.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={description}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {description}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                aria-label="Tutup"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 p-2 min-h-[220px] max-h-[70vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={description}
                className="max-h-[60vh] max-w-full object-contain rounded"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Buka Berkas Penuh</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
