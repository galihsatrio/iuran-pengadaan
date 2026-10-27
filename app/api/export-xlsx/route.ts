import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatDateID } from "@/lib/format";
import type { IuranRecord } from "@/lib/types";
import {
  calculateResidentTotals,
  calculateResidentDuesStatus,
  getResidentKey,
} from "@/lib/dues";

// ponytail: Generates XLSX in-memory using SheetJS. Upgrade to streaming workbook if records exceed 50k rows.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Konfigurasi Supabase belum terpasang." },
      { status: 503 }
    );
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Gagal menginisialisasi database." },
      { status: 500 }
    );
  }

  // Public read only required fields; no private/internal fields exposed
  let records: IuranRecord[] = [];
  const { data, error } = await supabase
    .from("iuran")
    .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, is_key_collected, created_at")
    .order("created_at", { ascending: false });

  if (error && (error.code === "42703" || error.message.includes("column"))) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("iuran")
      .select("id, nama_blok, nomor_blok, nama_kepala_keluarga, amount, created_at")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      return NextResponse.json(
        { error: "Gagal mengambil data iuran: " + fallbackError.message },
        { status: 500 }
      );
    }
    records = (fallbackData as IuranRecord[]) || [];
  } else if (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data iuran: " + error.message },
      { status: 500 }
    );
  } else {
    records = (data as IuranRecord[]) || [];
  }

  const residentTotals = calculateResidentTotals(records);

  const rows = records.map((item, index) => {
    const rKey = getResidentKey(item);
    const cumulative = residentTotals.get(rKey) || Number(item.amount || 0);
    const duesStatus = calculateResidentDuesStatus(cumulative);
    const isEligible = cumulative >= 75000;
    const statusKunci = !isEligible
      ? "Belum Berhak"
      : item.is_key_collected
      ? "Sudah Ambil"
      : "Belum Ambil";

    return {
      No: index + 1,
      "Nama Blok": item.nama_blok,
      "Nomor Rumah": item.nomor_blok,
      "Nama Kepala Keluarga": item.nama_kepala_keluarga || "-",
      "Jumlah (Rp)": item.amount,
      Tahap: duesStatus.stageLabel,
      "Target (Rp)": duesStatus.target,
      "Sisa Tagihan (Rp)": duesStatus.outstandingBalance,
      "Status Kunci": statusKunci,
      "Waktu Pencatatan": formatDateID(item.created_at),
    };
  });

  const totalAmount = records.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Append total summary row
  rows.push({
    No: 0,
    "Nama Blok": "",
    "Nomor Rumah": "",
    "Nama Kepala Keluarga": "TOTAL TERKUMPUL",
    "Jumlah (Rp)": totalAmount,
    Tahap: "",
    "Target (Rp)": 0,
    "Sisa Tagihan (Rp)": 0,
    "Status Kunci": "",
    "Waktu Pencatatan": "",
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column width hints
  ws["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Iuran Portal");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rekap-iuran-portal.xlsx"',
    },
  });
}
