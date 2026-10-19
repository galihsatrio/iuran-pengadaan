"use client";

import { useState, useId, useEffect } from "react";
import type { PublicGalleryItem, GalleryCategory } from "@/lib/types";
import { formatDateOnlyID } from "@/lib/format";

interface GalleryViewProps {
  initialItems: PublicGalleryItem[];
}

export default function GalleryView({ initialItems }: GalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | GalleryCategory>("all");
  const [activePhoto, setActivePhoto] = useState<PublicGalleryItem | null>(null);
  const modalHeadingId = useId();

  // Close modal on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActivePhoto(null);
      }
    }
    if (activePhoto) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto]);

  const filteredItems =
    selectedCategory === "all"
      ? initialItems
      : initialItems.filter((item) => item.category === selectedCategory);

  const countKegiatan = initialItems.filter((item) => item.category === "kegiatan").length;
  const countHasil = initialItems.filter((item) => item.category === "hasil").length;

  return (
    <div>
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8" role="tablist" aria-label="Filter Kategori Galeri">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "all"}
          onClick={() => setSelectedCategory("all")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            selectedCategory === "all"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <span>Semua Foto</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
              selectedCategory === "all" ? "bg-emerald-700 text-emerald-100" : "bg-slate-100 text-slate-600"
            }`}
          >
            {initialItems.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "kegiatan"}
          onClick={() => setSelectedCategory("kegiatan")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            selectedCategory === "kegiatan"
              ? "bg-sky-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <span>Kegiatan Kerja Bakti</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
              selectedCategory === "kegiatan" ? "bg-sky-700 text-sky-100" : "bg-slate-100 text-slate-600"
            }`}
          >
            {countKegiatan}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "hasil"}
          onClick={() => setSelectedCategory("hasil")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
            selectedCategory === "hasil"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <span>Hasil Kerja Bakti</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
              selectedCategory === "hasil" ? "bg-emerald-800 text-emerald-100" : "bg-slate-100 text-slate-600"
            }`}
          >
            {countHasil}
          </span>
        </button>
      </div>

      {/* Photo Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-3">
            📷
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Belum Ada Foto Dokumentasi
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {selectedCategory === "all"
              ? "Dokumentasi kerja bakti dan hasil pengadaan portal belum diunggah oleh pengurus."
              : `Belum ada foto dokumentasi untuk kategori ${
                  selectedCategory === "kegiatan" ? "kegiatan kerja bakti" : "hasil kerja bakti"
                }.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="group bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActivePhoto(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActivePhoto(item);
                  }
                }}
                className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
                aria-label={`Lihat foto ${item.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                    Perbesar
                  </span>
                </div>
                <div className="absolute top-2.5 left-2.5">
                  {item.category === "kegiatan" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100/90 text-sky-800 backdrop-blur-xs ring-1 ring-sky-300/50 shadow-2xs">
                      Kegiatan Kerja Bakti
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100/90 text-emerald-800 backdrop-blur-xs ring-1 ring-emerald-300/50 shadow-2xs">
                      Hasil Kerja Bakti
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <time dateTime={item.created_at}>{formatDateOnlyID(item.created_at)}</time>
                  <button
                    type="button"
                    onClick={() => setActivePhoto(item)}
                    className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
                  >
                    Detail
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalHeadingId}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 id={modalHeadingId} className="font-bold text-sm sm:text-base text-slate-900 truncate">
                    {activePhoto.title}
                  </h3>
                  {activePhoto.category === "kegiatan" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200/50 shrink-0">
                      Kegiatan
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50 shrink-0">
                      Hasil
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diunggah: {formatDateOnlyID(activePhoto.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activePhoto.image_url}
                  download={`galeri-${activePhoto.category}-${activePhoto.id}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Unduh</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="w-9 h-9 min-h-[36px] rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
                  aria-label="Tutup pratinjau foto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Image */}
            <div className="relative bg-slate-900 flex items-center justify-center min-h-[220px] max-h-[60vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.image_url}
                alt={activePhoto.title}
                className="max-w-full max-h-[60vh] object-contain mx-auto"
              />
            </div>

            {/* Modal Caption */}
            {activePhoto.caption && (
              <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activePhoto.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
