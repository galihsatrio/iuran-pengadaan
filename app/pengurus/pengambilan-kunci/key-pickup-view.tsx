"use client";

import { useState, useMemo } from "react";
import { formatIDR, formatDateID } from "@/lib/format";
import KeyPickupToggle from "../key-pickup-toggle";
import type { ResidentKeyItem } from "./page";

interface KeyPickupViewProps {
  initialItems: ResidentKeyItem[];
}

type FilterTab = "semua" | "berhak" | "sudah" | "belum";

export default function KeyPickupView({ initialItems }: KeyPickupViewProps) {
  const [items, setItems] = useState<ResidentKeyItem[]>(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("semua");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");

  // Synchronize when initialItems change from server revalidation
  if (prevInitialItems !== initialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  const handleStatusChange = (residentKey: string, newStatus: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.residentKey === residentKey
          ? {
              ...item,
              isCollected: newStatus,
              keyCollectedAt: newStatus ? new Date().toISOString() : null,
            }
          : item
      )
    );
  };

  // Distinct blocks for block filter
  const availableBlocks = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.namaBlok) set.add(item.namaBlok);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "id", { numeric: true, sensitivity: "base" })
    );
  }, [items]);

  // Metric counts
  const totalWargaMembayar = items.length;
  const wargaBerhak = items.filter((i) => i.isEligible).length;
  const kunciSudahDiambil = items.filter((i) => i.isEligible && i.isCollected).length;
  const kunciBelumDiambil = items.filter((i) => i.isEligible && !i.isCollected).length;

  // Filtered list
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // 1. Block filter
      if (selectedBlock !== "all" && item.namaBlok !== selectedBlock) {
        return false;
      }

      // 2. Tab filter
      if (activeTab === "berhak" && !item.isEligible) {
        return false;
      }
      if (activeTab === "sudah" && (!item.isEligible || !item.isCollected)) {
        return false;
      }
      if (activeTab === "belum" && (!item.isEligible || item.isCollected)) {
        return false;
      }

      // 3. Search query
      if (q) {
        const matchName = item.namaKepalaKeluarga.toLowerCase().includes(q);
        const matchBlok = item.namaBlok.toLowerCase().includes(q);
        const matchNomor = item.nomorBlok.toLowerCase().includes(q);
        const matchCombined = `${item.namaBlok} ${item.nomorBlok}`.toLowerCase().includes(q);
        if (!matchName && !matchBlok && !matchNomor && !matchCombined) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, selectedBlock, activeTab]);

  // Group filtered items by block
  const groupedBlocks = useMemo(() => {
    const map = new Map<string, ResidentKeyItem[]>();

    for (const item of filteredItems) {
      const blockKey = item.namaBlok ? item.namaBlok.trim() : "Tanpa Blok";
      const list = map.get(blockKey);
      if (!list) {
        map.set(blockKey, [item]);
      } else {
        list.push(item);
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "id", { numeric: true, sensitivity: "base" }))
      .map(([namaBlok, blockItems]) => {
        const eligibleCount = blockItems.filter((i) => i.isEligible).length;
        const collectedCount = blockItems.filter((i) => i.isEligible && i.isCollected).length;
        return {
          namaBlok,
          items: blockItems,
          totalCount: blockItems.length,
          eligibleCount,
          collectedCount,
        };
      });
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Warga Membayar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Warga Membayar
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {totalWargaMembayar}{" "}
              <span className="text-xs font-medium text-slate-500">Warga</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Telah berpartisipasi iuran</p>
          </div>
        </div>

        {/* Card 2: Berhak Ambil Kunci */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Berhak Kunci (≥ 75rb)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              {wargaBerhak}{" "}
              <span className="text-xs font-medium text-emerald-600">Warga</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Memenuhi batas minimum</p>
          </div>
        </div>

        {/* Card 3: Kunci Sudah Diambil */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              Sudah Diambil
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-sky-700 tracking-tight">
              {kunciSudahDiambil}{" "}
              <span className="text-xs font-medium text-sky-600">Warga</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Fisik kunci diserahkan</p>
          </div>
        </div>

        {/* Card 4: Belum Diambil */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Belum Diambil
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-amber-700 tracking-tight">
              {kunciBelumDiambil}{" "}
              <span className="text-xs font-medium text-amber-600">Warga</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Menunggu penyerahan kunci</p>
          </div>
        </div>
      </div>

      {/* Search, Block Select & Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama warga, blok, atau no. rumah..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Hapus pencarian"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Block Filter Select */}
          {availableBlocks.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="block-filter" className="text-xs font-medium text-slate-500 shrink-0">
                Blok:
              </label>
              <select
                id="block-filter"
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="all">Semua Blok ({items.length})</option>
                {availableBlocks.map((blok) => {
                  const blockCount = items.filter((i) => i.namaBlok === blok).length;
                  return (
                    <option key={blok} value={blok}>
                      Blok {blok} ({blockCount})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100" role="tablist" aria-label="Filter status kunci">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "semua"}
            onClick={() => setActiveTab("semua")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "semua"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Semua</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "semua" ? "bg-slate-700 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {totalWargaMembayar}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "berhak"}
            onClick={() => setActiveTab("berhak")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "berhak"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span>Berhak Ambil Kunci</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "berhak" ? "bg-emerald-700 text-emerald-100" : "bg-white text-emerald-700 border border-emerald-200"
              }`}
            >
              {wargaBerhak}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sudah"}
            onClick={() => setActiveTab("sudah")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "sudah"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
            }`}
          >
            <span>Sudah Diambil</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "sudah" ? "bg-sky-700 text-sky-100" : "bg-white text-sky-700 border border-sky-200"
              }`}
            >
              {kunciSudahDiambil}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "belum"}
            onClick={() => setActiveTab("belum")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "belum"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <span>Belum Diambil</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "belum" ? "bg-amber-700 text-amber-100" : "bg-white text-amber-700 border border-amber-200"
              }`}
            >
              {kunciBelumDiambil}
            </span>
          </button>
        </div>
      </div>

      {/* Main List Table (Grouped by Block) */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Daftar Warga Per Blok &amp; Status Kunci
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredItems.length} warga ({groupedBlocks.length} blok)
          </span>
        </div>

        {groupedBlocks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">Tidak ada data warga ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? "Coba ubah kata kunci pencarian Anda." : "Belum ada data warga dengan filter ini."}
            </p>
          </div>
        ) : (
          groupedBlocks.map((group) => (
            <div
              key={group.namaBlok}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Block Header */}
              <div className="bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {group.namaBlok === "Tanpa Blok" ? "Tanpa Blok" : `Blok ${group.namaBlok}`}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {group.totalCount} Warga
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span>{group.eligibleCount} Berhak</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                    <svg className="w-3 h-3 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{group.collectedCount} Sudah Ambil</span>
                  </span>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="py-2.5 px-4 w-12 text-center">
                        No
                      </th>
                      <th scope="col" className="py-2.5 px-4">
                        Nomor Rumah
                      </th>
                      <th scope="col" className="py-2.5 px-4">
                        Nama Kepala Keluarga
                      </th>
                      <th scope="col" className="py-2.5 px-4 text-right">
                        Total Iuran
                      </th>
                      <th scope="col" className="py-2.5 px-4 text-center">
                        Hak Kunci
                      </th>
                      <th scope="col" className="py-2.5 px-4 text-center">
                        Checklist Ambil Kunci
                      </th>
                      <th scope="col" className="py-2.5 px-4 text-center">
                        Waktu Ambil
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map((item, index) => (
                      <tr
                        key={item.residentKey}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-2.5 px-4 text-center text-slate-400 text-xs font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                            No. {item.nomorBlok || "-"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">
                          <div>
                            <span>{item.namaKepalaKeluarga || "-"}</span>
                            {item.paymentCount > 1 && (
                              <span className="ml-2 text-[10px] text-slate-400 font-normal">
                                ({item.paymentCount}x bayar)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap">
                          {formatIDR(item.totalPaid)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {item.isEligible ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Bisa Ambil Kunci
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Kurang {formatIDR(Math.max(0, 75000 - item.totalPaid))}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <KeyPickupToggle
                            key={`${item.primaryRecordId}-${item.isCollected}`}
                            id={item.primaryRecordId}
                            isCollected={item.isCollected}
                            isEligible={item.isEligible}
                            onStatusChange={(newStatus) => handleStatusChange(item.residentKey, newStatus)}
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center text-xs text-slate-500 whitespace-nowrap">
                          {item.isCollected && item.keyCollectedAt
                            ? formatDateID(item.keyCollectedAt)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-slate-100">
                {group.items.map((item, index) => (
                  <div key={item.residentKey} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{index + 1}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                          No. {item.nomorBlok || "-"}
                        </span>
                      </div>
                      {item.isEligible ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          <svg className="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Bisa Ambil Kunci
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          Belum Berhak
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {item.namaKepalaKeluarga || "-"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total Iuran: <strong className="text-emerald-700 font-semibold">{formatIDR(item.totalPaid)}</strong>
                        {item.paymentCount > 1 && (
                          <span className="text-slate-400 ml-1">({item.paymentCount}x bayar)</span>
                        )}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500">
                        {item.isCollected && item.keyCollectedAt ? (
                          <span>Diambil: {formatDateID(item.keyCollectedAt)}</span>
                        ) : (
                          <span>Status Kunci:</span>
                        )}
                      </div>
                      <KeyPickupToggle
                        key={`${item.primaryRecordId}-${item.isCollected}`}
                        id={item.primaryRecordId}
                        isCollected={item.isCollected}
                        isEligible={item.isEligible}
                        onStatusChange={(newStatus) => handleStatusChange(item.residentKey, newStatus)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
