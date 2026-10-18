"use client";

import { useState, useTransition, useActionState, useEffect, useRef } from "react";
import { updateIuranRecord, deleteIuranRecord } from "./actions";
import { formatIDR } from "@/lib/format";
import type { IuranRecord } from "@/lib/types";

export default function IuranRowActions({ record }: { record: IuranRecord }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateActionWithId = updateIuranRecord.bind(null, record.id);
  const [editState, formAction, isPendingEdit] = useActionState(
    updateActionWithId,
    { success: false, message: "" }
  );

  // Calculate viewport-aware fixed coordinates for menu
  const updateMenuPosition = () => {
    const trigger = triggerButtonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 128; // w-32
    const menuHeight = 80;
    const padding = 8;

    let left = rect.right - menuWidth;
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - padding && rect.top - menuHeight - 4 > padding) {
      top = rect.top - menuHeight - 4;
    }

    setMenuCoords({ top, left });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateMenuPosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close menu on scroll, resize, Escape, or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerButtonRef.current?.focus();
      }
    };

    const handleReposition = () => {
      updateMenuPosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus restore & dialog visibility management for Edit
  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!dialog) return;

    if (isEditing) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      triggerButtonRef.current?.focus();
    }
  }, [isEditing]);

  // Focus restore & dialog visibility management for Delete
  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;

    if (isDeleting) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      triggerButtonRef.current?.focus();
    }
  }, [isDeleting]);

  // Handle successful edit: close dialog after state updates to success
  useEffect(() => {
    if (editState.success && isEditing) {
      const timer = setTimeout(() => {
        setIsEditing(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [editState.success, isEditing]);

  const handleDelete = () => {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteIuranRecord(record.id);
      if (!res.success) {
        setDeleteError(res.message);
      } else {
        setIsDeleting(false);
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      {/* Dropdown Menu Container */}
      <div className="relative inline-block text-left">
        <button
          ref={triggerButtonRef}
          type="button"
          onClick={handleToggle}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-colors shadow-xs"
        >
          <span>Opsi</span>
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
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && menuCoords && (
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
            className="w-32 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-50 focus:outline-hidden text-left"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsEditing(true);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setDeleteError(null);
                setIsDeleting(true);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-rose-500"
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
          </div>
        )}
      </div>

      {/* Modal Edit: Native <dialog> provides built-in focus trap and Escape key handling */}
      <dialog
        ref={editDialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setIsEditing(false);
        }}
        aria-labelledby="edit-dialog-title"
        className="fixed inset-0 m-auto p-0 rounded-xl border border-slate-200 shadow-xl max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto bg-white text-slate-900 backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs z-50"
      >
        <div className="p-6 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3
              id="edit-dialog-title"
              className="text-base font-bold text-slate-900"
            >
              Edit Data Iuran
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>

          {editState.message && (
            <div
              role="alert"
              className={`mt-4 p-3 rounded-lg text-xs ${
                editState.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {editState.message}
            </div>
          )}

          <form action={formAction} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={`edit_nama_blok_${record.id}`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nama Blok <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`edit_nama_blok_${record.id}`}
                  name="nama_blok"
                  type="text"
                  required
                  maxLength={50}
                  defaultValue={record.nama_blok}
                  disabled={isPendingEdit}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
                {editState.errors?.nama_blok && (
                  <p className="mt-1 text-xs text-rose-600">
                    {editState.errors.nama_blok}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`edit_nomor_blok_${record.id}`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nomor Blok / Rumah <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`edit_nomor_blok_${record.id}`}
                  name="nomor_blok"
                  type="text"
                  required
                  maxLength={20}
                  defaultValue={record.nomor_blok}
                  disabled={isPendingEdit}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
                {editState.errors?.nomor_blok && (
                  <p className="mt-1 text-xs text-rose-600">
                    {editState.errors.nomor_blok}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor={`edit_nama_kepala_keluarga_${record.id}`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nama Kepala Keluarga <span className="text-rose-500">*</span>
              </label>
              <input
                id={`edit_nama_kepala_keluarga_${record.id}`}
                name="nama_kepala_keluarga"
                type="text"
                required
                maxLength={100}
                defaultValue={record.nama_kepala_keluarga}
                disabled={isPendingEdit}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
              {editState.errors?.nama_kepala_keluarga && (
                <p className="mt-1 text-xs text-rose-600">
                  {editState.errors.nama_kepala_keluarga}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`edit_amount_${record.id}`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Jumlah Iuran (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                id={`edit_amount_${record.id}`}
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={record.amount}
                disabled={isPendingEdit}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
              {editState.errors?.amount && (
                <p className="mt-1 text-xs text-rose-600">
                  {editState.errors.amount}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isPendingEdit}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPendingEdit}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isPendingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Modal Konfirmasi Hapus: Native <dialog> */}
      <dialog
        ref={deleteDialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setIsDeleting(false);
        }}
        aria-labelledby="delete-dialog-title"
        className="fixed inset-0 m-auto p-0 rounded-xl border border-slate-200 shadow-xl max-w-sm w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto bg-white text-slate-900 backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs z-50"
      >
        <div className="p-5 text-left">
          <h3
            id="delete-dialog-title"
            className="text-base font-bold text-slate-900"
          >
            Konfirmasi Hapus Data
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus catatan iuran untuk{" "}
            <strong>
              {record.nama_blok} No. {record.nomor_blok}
            </strong>{" "}
            atas nama <strong>{record.nama_kepala_keluarga}</strong> sebesar{" "}
            <strong className="text-emerald-700">
              {formatIDR(record.amount)}
            </strong>
            ? Tindakan ini tidak dapat dibatalkan.
          </p>

          {deleteError && (
            <div
              role="alert"
              className="mt-3 p-2.5 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800"
            >
              {deleteError}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleting(false)}
              disabled={isPendingDelete}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPendingDelete}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isPendingDelete ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
