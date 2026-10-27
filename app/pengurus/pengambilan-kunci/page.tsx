import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getResidentKey } from "@/lib/dues";
import { LogoutButton } from "../logout-button";
import KeyPickupView from "./key-pickup-view";
import type { IuranRecord } from "@/lib/types";

export const instant = false;

export interface ResidentKeyItem {
  residentKey: string;
  namaBlok: string;
  nomorBlok: string;
  namaKepalaKeluarga: string;
  totalPaid: number;
  isEligible: boolean;
  isCollected: boolean;
  keyCollectedAt: string | null;
  primaryRecordId: number;
  paymentCount: number;
}

// ponytail: Dedicated key collection page for housing gate keys. Aggregates dues per resident household (>= Rp 75.000).
export default async function PengambilanKunciPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-slate-900">
            Konfigurasi Supabase Belum Terpasang
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pengaturan Supabase diperlukan untuk mengakses area pengurus. Silakan
            atur variabel lingkungan terlebih dahulu.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Kembali ke Rekap Warga
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-rose-200 shadow-sm text-center">
          <div className="text-3xl mb-3">🚫</div>
          <h1 className="text-lg font-bold text-slate-900">
            Akses Ditolak (Bukan Pengurus)
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Akun <strong>{user.email}</strong> berhasil masuk, namun ID Anda belum terdaftar dalam tabel pengurus_allowlist.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Lihat Rekap Publik
            </Link>
            <LogoutButton variant="card" />
          </div>
        </div>
      </div>
    );
  }

  let iuranData: IuranRecord[] | null = null;
  const { data: fullData, error: fullError } = await supabase
    .from("iuran")
    .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, is_key_collected, key_collected_at, created_at")
    .order("created_at", { ascending: false });

  if (fullError && (fullError.code === "42703" || fullError.message.includes("column"))) {
    const { data: fallbackData } = await supabase
      .from("iuran")
      .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, created_at")
      .order("created_at", { ascending: false });
    iuranData = fallbackData as IuranRecord[] | null;
  } else {
    iuranData = fullData as IuranRecord[] | null;
  }

  const records = (iuranData as IuranRecord[]) || [];

  // Group by resident household (nama_blok + nomor_blok)
  const residentMap = new Map<string, ResidentKeyItem>();

  for (const r of records) {
    const rKey = getResidentKey(r);
    const existing = residentMap.get(rKey);
    const amount = Number(r.amount || 0);
    const isCollected = Boolean(r.is_key_collected);
    const keyCollectedAt = r.key_collected_at || null;

    if (!existing) {
      residentMap.set(rKey, {
        residentKey: rKey,
        namaBlok: (r.nama_blok || "").trim(),
        nomorBlok: (r.nomor_blok || "").trim(),
        namaKepalaKeluarga: (r.nama_kepala_keluarga || "").trim(),
        totalPaid: amount,
        isEligible: false, // calculated after loop
        isCollected,
        keyCollectedAt,
        primaryRecordId: r.id,
        paymentCount: 1,
      });
    } else {
      existing.totalPaid += amount;
      existing.paymentCount += 1;
      // Prefer collected status if any record was marked
      if (isCollected) {
        existing.isCollected = true;
        if (!existing.keyCollectedAt && keyCollectedAt) {
          existing.keyCollectedAt = keyCollectedAt;
        }
      }
      if (!existing.namaKepalaKeluarga && r.nama_kepala_keluarga) {
        existing.namaKepalaKeluarga = r.nama_kepala_keluarga.trim();
      }
    }
  }

  // Calculate eligibility threshold: Rp 75.000 minimum
  const items: ResidentKeyItem[] = Array.from(residentMap.values()).map((item) => ({
    ...item,
    isEligible: item.totalPaid >= 75000,
  }));

  // Sort items: Blok name alphabetically, then House number numerically, then resident name
  items.sort((a, b) => {
    const blockComp = a.namaBlok.localeCompare(b.namaBlok, "id", { numeric: true, sensitivity: "base" });
    if (blockComp !== 0) return blockComp;
    const numComp = a.nomorBlok.localeCompare(b.nomorBlok, "id", { numeric: true, sensitivity: "base" });
    if (numComp !== 0) return numComp;
    return a.namaKepalaKeluarga.localeCompare(b.namaKepalaKeluarga, "id");
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Pengambilan Kunci Portal Warga
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar checklist penyerahan kunci fisik portal lingkungan kepada warga yang telah memenuhi syarat iuran (minimal Rp75.000).
          </p>
        </div>

        <Link
          href="/pengurus"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Data Iuran Warga</span>
        </Link>
      </div>

      <KeyPickupView initialItems={items} />
    </main>
  );
}
