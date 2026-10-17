import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatDateID } from "@/lib/format";
import type { IuranRecord } from "@/lib/types";

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
  const { data, error } = await supabase
    .from("iuran")
    .select("id, nama_blok, nomor_blok, amount, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data iuran: " + error.message },
      { status: 500 }
    );
  }

  const records = (data as IuranRecord[]) || [];

  const rows = records.map((item, index) => ({
    No: index + 1,
    "Nama Blok": item.nama_blok,
    "Nomor Blok": item.nomor_blok,
    "Jumlah (Rp)": item.amount,
    "Waktu Pencatatan": formatDateID(item.created_at),
  }));

  const totalAmount = records.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Append total summary row
  rows.push({
    No: 0,
    "Nama Blok": "",
    "Nomor Blok": "TOTAL TERKUMPUL",
    "Jumlah (Rp)": totalAmount,
    "Waktu Pencatatan": "",
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column width hints
  ws["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
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
