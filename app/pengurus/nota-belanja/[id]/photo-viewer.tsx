"use client";

import { useEffect, useState } from "react";

interface NotePhotoViewerProps {
  signedUrl: string;
  title: string;
}

export default function NotePhotoViewer({ signedUrl, title }: NotePhotoViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  return (
    <>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto Struk / Nota
          </span>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
            Lihat Ukuran Penuh
          </button>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={`Foto nota: ${title}`}
            onClick={() => setFullscreen(true)}
            className="w-full object-contain max-h-80 cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
          />
          <div
            onClick={() => setFullscreen(true)}
            className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/10 transition-colors cursor-zoom-in flex items-end justify-end p-2.5"
          >
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900/70 text-white text-[11px] font-medium shadow-xs">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              Klik untuk perbesar
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox Fullscreen */}
      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto penuh: ${title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Tutup foto penuh"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt={`Foto nota penuh: ${title}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-900/60 text-white text-xs font-medium">
              {title} · Klik di luar atau tekan Esc untuk menutup
            </span>
          </div>
        </div>
      )}
    </>
  );
}
