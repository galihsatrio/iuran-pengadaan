"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteShoppingNoteAction } from "../actions";
import { formatIDR, formatDateOnlyID } from "@/lib/format";
import type { ShoppingNoteItem } from "@/lib/types";

interface NoteActionsMenuProps {
  id: number;
  title: string;
  date: string;
  totalAmount: number;
  items: ShoppingNoteItem[];
  signedPhotoUrl: string | null;
}

export default function NoteActionsMenu({
  id,
  title,
  date,
  totalAmount,
  items,
  signedPhotoUrl,
}: NoteActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const locked = showDetail || confirming;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showDetail, confirming]);

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteShoppingNoteAction(id);
      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setConfirming(false);
        setOpen(false);
      }
    });
  };

  return (
    <>
      <div ref={menuRef} className="relative inline-block text-left">
        {/* Trigger: tiga titik */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Opsi aksi nota"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            aria-label="Menu aksi nota"
            className="absolute right-0 z-30 mt-1.5 w-44 origin-top-right rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="py-1">
              {/* Lihat Detail — buka modal */}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setShowDetail(true); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Lihat Detail
              </button>

              {/* Edit */}
              <Link
                href={`/pengurus/nota-belanja/${id}/edit`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Ubah Nota
              </Link>

              <div className="my-1 border-t border-slate-100" role="separator" />

              {/* Hapus */}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setConfirming(true); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus Nota
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Detail ── */}
      {showDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail Nota: ${title}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-slate-400">Nota #{id} · {formatDateOnlyID(date)}</p>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 leading-snug break-words">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
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
              {signedPhotoUrl ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signedPhotoUrl}
                    alt={`Foto nota: ${title}`}
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
                  Rincian Barang ({items.length} item)
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
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">
                            Tidak ada rincian item.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
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
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-700 whitespace-nowrap">{formatIDR(totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50/60">
              <Link
                href={`/pengurus/nota-belanja/${id}/edit`}
                onClick={() => setShowDetail(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Ubah Nota
              </Link>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus ── */}
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Hapus Nota"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => !isPending && setConfirming(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Hapus Nota Belanja?</h3>
            <p className="mt-1.5 text-xs text-slate-600">
              Yakin hapus nota <strong className="text-slate-800">&ldquo;{title}&rdquo;</strong>? Semua rincian barang dan foto struk akan ikut terhapus.
            </p>
            {errorMessage && (
              <div className="mt-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
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
