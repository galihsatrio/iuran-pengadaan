"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { uploadGalleryPhotoAction, type ActionResult } from "../actions";

const initialState: ActionResult = {
  success: false,
  message: "",
};

export default function GalleryUploadForm() {
  const [state, formAction, isPending] = useActionState(
    uploadGalleryPhotoAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayPreview = state.success ? null : previewUrl;
  const displayFile = state.success ? null : selectedFile;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          Unggah Foto Dokumentasi Baru
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Unggah foto dokumentasi kegiatan gotong royong kerja bakti atau hasil pengadaan portal warga.
        </p>
      </div>

      {state.message && (
        <div
          role="alert"
          className={`mb-5 p-3.5 rounded-lg text-xs sm:text-sm border ${
            state.success
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {state.message}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        {/* Judul Foto */}
        <div>
          <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Judul Foto <span className="text-rose-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={150}
            disabled={isPending}
            placeholder="Contoh: Kerja bakti pengecoran tiang portal blok B"
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          {state.errors?.title && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.title}</p>
          )}
        </div>

        {/* Kategori Foto */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
            Kategori Dokumentasi <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer has-checked:border-sky-500 has-checked:bg-sky-50/50 has-checked:ring-1 has-checked:ring-sky-500">
              <input
                type="radio"
                name="category"
                value="kegiatan"
                defaultChecked
                disabled={isPending}
                className="text-sky-600 focus:ring-sky-500"
              />
              <div>
                <span className="block text-xs sm:text-sm font-semibold text-slate-900">
                  Kegiatan Kerja Bakti
                </span>
                <span className="block text-[11px] text-slate-500">
                  Foto saat warga bergotong royong atau proses pemasangan.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer has-checked:border-emerald-500 has-checked:bg-emerald-50/50 has-checked:ring-1 has-checked:ring-emerald-500">
              <input
                type="radio"
                name="category"
                value="hasil"
                disabled={isPending}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="block text-xs sm:text-sm font-semibold text-slate-900">
                  Hasil Kerja Bakti
                </span>
                <span className="block text-[11px] text-slate-500">
                  Foto fisik portal terpasang, rambu, atau fasilitas jadi.
                </span>
              </div>
            </label>
          </div>
          {state.errors?.category && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.category}</p>
          )}
        </div>

        {/* Keterangan / Caption */}
        <div>
          <label htmlFor="caption" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Keterangan Foto <span className="text-slate-400 font-normal">(Opsional)</span>
          </label>
          <textarea
            id="caption"
            name="caption"
            rows={3}
            maxLength={500}
            disabled={isPending}
            placeholder="Jelaskan detail momen atau lokasi kegiatan (maksimal 500 karakter)..."
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
          />
          {state.errors?.caption && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.caption}</p>
          )}
        </div>

        {/* Berkas Foto & Preview */}
        <div>
          <label htmlFor="image" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
            Berkas Gambar Foto <span className="text-rose-500">*</span>
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            disabled={isPending}
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-white focus-visible:outline-2 focus-visible:outline-emerald-600"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Format yang didukung: PNG, JPG, JPEG, WEBP. Maksimal ukuran 5MB.
          </p>
          {state.errors?.image && (
            <p className="mt-1 text-xs text-rose-600">{state.errors.image}</p>
          )}

          {displayPreview && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 inline-block">
              <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                Pratinjau Foto ({displayFile ? `${Math.round(displayFile.size / 1024)} KB` : ""}):
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayPreview}
                alt="Pratinjau foto sebelum diunggah"
                className="max-h-48 rounded object-contain border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Mengunggah Foto...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Unggah ke Galeri</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
