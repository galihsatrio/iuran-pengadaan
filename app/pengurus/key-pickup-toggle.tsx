"use client";

import { useTransition, useState } from "react";
import { toggleKeyCollectionAction } from "./actions";

interface KeyPickupToggleProps {
  id: number;
  isCollected: boolean;
  isEligible: boolean;
  onStatusChange?: (collected: boolean) => void;
}

export default function KeyPickupToggle({
  id,
  isCollected: initialCollected,
  isEligible,
  onStatusChange,
}: KeyPickupToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [collected, setCollected] = useState(initialCollected);
  const [prevInitial, setPrevInitial] = useState(initialCollected);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (prevInitial !== initialCollected) {
    setPrevInitial(initialCollected);
    setCollected(initialCollected);
  }

  const handleToggle = () => {
    if (!isEligible || isPending) return;
    const nextState = !collected;

    // Optimistic update
    setCollected(nextState);
    setErrorMsg(null);
    onStatusChange?.(nextState);

    startTransition(async () => {
      const res = await toggleKeyCollectionAction(id, nextState);
      if (!res.success) {
        // Revert on failure
        setCollected(!nextState);
        setErrorMsg(res.message);
        onStatusChange?.(!nextState);
      }
    });
  };

  if (!isEligible) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 select-none">
        <input
          type="checkbox"
          disabled
          checked={false}
          className="w-4 h-4 rounded border-slate-300 text-slate-400 bg-slate-100 cursor-not-allowed"
          aria-label="Belum memenuhi syarat ambil kunci"
        />
        <span className="text-[11px] text-slate-400">Belum Berhak</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center">
      <label
        className={`inline-flex items-center gap-1.5 cursor-pointer select-none text-xs ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={collected}
          disabled={isPending}
          onChange={handleToggle}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          aria-label={collected ? "Sudah ambil kunci" : "Belum ambil kunci"}
        />
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
            collected
              ? "bg-emerald-50 text-emerald-700 font-semibold"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isPending
            ? "Menyimpan..."
            : collected
            ? "Sudah Ambil"
            : "Belum Ambil"}
        </span>
      </label>
      {errorMsg && (
        <span className="text-[10px] text-rose-600 mt-0.5 max-w-[120px] text-center" role="alert">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
