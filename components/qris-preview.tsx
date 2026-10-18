"use client";

import { useState } from "react";

interface QrisPreviewToggleProps {
  imageUrl: string;
  name?: string;
  buttonLabel?: string;
  className?: string;
}

export default function QrisPreviewToggle({
  imageUrl,
  name = "QRIS Pembayaran Iuran Warga",
  buttonLabel = "Preview QRIS",
  className = "",
}: QrisPreviewToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = "qris-preview-collapse-panel";

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-start sm:justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          <span>{isOpen ? "Tutup Preview" : buttonLabel}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-label="Tampilan Kode QRIS"
          className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center text-center"
        >
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Kode QRIS Pembayaran Iuran"
              className="w-56 sm:w-64 max-h-80 object-contain mx-auto rounded-lg"
            />
          </div>

          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-800">
            {name}
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Pindai kode QRIS di atas menggunakan mobile banking (BCA, Mandiri, BRI, BNI) atau dompet digital (GoPay, OVO, Dana, ShopeePay).
          </p>

          <div className="mt-3">
            <a
              href={imageUrl}
              download="qris-iuran-warga.png"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Unduh Gambar QRIS</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
