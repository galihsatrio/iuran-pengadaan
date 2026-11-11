"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ShoppingNote } from "@/lib/types";
import { formatIDR, formatDateOnlyID } from "@/lib/format";
import NoteActionsMenu from "./note-actions-menu";

export interface NoteWithPhoto extends ShoppingNote {
  signedPhotoUrl: string | null;
}

interface NotaBelanjaListProps {
  notes: NoteWithPhoto[];
}

export default function NotaBelanjaList({ notes }: NotaBelanjaListProps) {
  const [selectedNote, setSelectedNote] = useState<NoteWithPhoto | null>(null);

  // Lock body scroll saat modal detail terbuka
  useEffect(() => {
    document.body.style.overflow = selectedNote ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedNote]);

  // Tutup modal pada tombol Escape
  useEffect(() => {
    if (!selectedNote) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedNote(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedNote]);

  if (notes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile Card List (< sm) */}
      <div className="sm:hidden space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => setSelectedNote(note)}
            className="relative bg-white rounded-xl border border-slate-200 shadow-xs p-4 active:bg-slate-50 transition-colors cursor-pointer min-h-[48px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500 font-mono">
                  {formatDateOnlyID(note.date)}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mt-1 leading-snug break-words">
                  {note.title}
                </h3>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {formatIDR(note.total_amount)}
                  </span>
                  {note.photo_path ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ada Foto
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Tanpa foto</span>
                  )}
                </div>
              </div>

              <div
                className="relative z-10 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <NoteActionsMenu
                  id={note.id}
                  title={note.title}
                  onOpenDetail={() => setSelectedNote(note)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (>= sm) */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th scope="col" className="px-4 py-3">Tanggal</th>
                <th scope="col" className="px-4 py-3">Judul Nota</th>
                <th scope="col" className="px-4 py-3 text-right">Total Nominal</th>
                <th scope="col" className="px-4 py-3 text-center">Foto Struk</th>
                <th scope="col" className="px-4 py-3 text-center w-14">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notes.map((note) => (
                <tr key={note.id} className="hover:bg-slate-50/75 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                    {formatDateOnlyID(note.date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/pengurus/nota-belanja/${note.id}`}
                      className="hover:text-emerald-700 hover:underline transition-colors font-semibold"
                    >
                      {note.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 text-right whitespace-nowrap">
                    {formatIDR(note.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {note.photo_path ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Ada Foto
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Tanpa foto</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <NoteActionsMenu
                      id={note.id}
                      title={note.title}
                      onOpenDetail={() => setSelectedNote(note)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Modal Detail */}
      {selectedNote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail Nota: ${selectedNote.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-slate-400">
                  Nota #{selectedNote.id} · {formatDateOnlyID(selectedNote.date)}
                </p>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 leading-snug break-words">
                  {selectedNote.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                aria-label="Tutup"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Foto Nota */}
              {selectedNote.signedPhotoUrl ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedNote.signedPhotoUrl}
                    alt={`Foto nota: ${selectedNote.title}`}
                    className="w-full object-contain max-h-64"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                  <svg className="w-6 h-6 mx-auto text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-slate-400">Tidak ada foto struk</p>
                </div>
              )}

              {/* Tabel Rincian Item */}
              <div>
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Rincian Barang ({(selectedNote.items ?? []).length} item)
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="px-3 py-2 w-8 text-center">No</th>
                        <th className="px-3 py-2">Nama Barang</th>
                        <th className="px-3 py-2 text-right">Harga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!(selectedNote.items && selectedNote.items.length > 0) ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">
                            Tidak ada rincian item.
                          </td>
                        </tr>
                      ) : (
                        selectedNote.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2 text-slate-800 font-medium">{item.item_name}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-900 whitespace-nowrap">{formatIDR(item.item_price)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                        <td colSpan={2} className="px-3 py-2.5 text-slate-900 text-xs">Total</td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-700 whitespace-nowrap">{formatIDR(selectedNote.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50/60">
              <Link
                href={`/pengurus/nota-belanja/${selectedNote.id}/edit`}
                onClick={() => setSelectedNote(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Ubah Nota
              </Link>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
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
