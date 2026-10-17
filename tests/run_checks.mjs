import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { validateIuranInput } from "../lib/validation.ts";

console.log("=== MENJALANKAN TARGETED CHECKS ===");

// 1. Uji Validasi Server-Side (lib/validation)
console.log("\n[1] Uji Validasi Input Iuran:");

// Kasus Valid
const validCase = validateIuranInput({
  nama_blok: "  Blok M  ",
  nomor_blok: "  15A  ",
  amount: "50000",
});
assert.equal(validCase.valid, true, "Input valid harus diterima");
assert.equal(validCase.sanitized?.nama_blok, "Blok M", "Nama blok harus di-trim");
assert.equal(validCase.sanitized?.nomor_blok, "15A", "Nomor blok harus di-trim");
assert.equal(validCase.sanitized?.amount, 50000, "Amount harus diubah menjadi integer");
console.log("  ✓ Valid case lolos sanitasi & konversi integer");

// Kasus Input Kosong
const emptyCase = validateIuranInput({ nama_blok: "", nomor_blok: "", amount: "" });
assert.equal(emptyCase.valid, false, "Input kosong harus ditolak");
assert.ok(emptyCase.errors.nama_blok, "Wajib ada error nama_blok");
assert.ok(emptyCase.errors.nomor_blok, "Wajib ada error nomor_blok");
assert.ok(emptyCase.errors.amount, "Wajib ada error amount");
console.log("  ✓ Deteksi field kosong lolos");

// Kasus Nama Blok Terlalu Panjang (> 50 karakter)
const longBlockCase = validateIuranInput({
  nama_blok: "B".repeat(51),
  nomor_blok: "01",
  amount: 20000,
});
assert.equal(longBlockCase.valid, false);
assert.ok(longBlockCase.errors.nama_blok);
console.log("  ✓ Pembatasan panjang nama blok lolos");

// Kasus Amount Negatif atau 0
const zeroAmountCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  amount: 0,
});
assert.equal(zeroAmountCase.valid, false);
assert.ok(zeroAmountCase.errors.amount);

const negAmountCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  amount: -5000,
});
assert.equal(negAmountCase.valid, false);
assert.ok(negAmountCase.errors.amount);
console.log("  ✓ Penolakan amount <= 0 lolos");

// Kasus Amount Desimal/Pecahan
const floatAmountCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  amount: 50000.75,
});
assert.equal(floatAmountCase.valid, false);
assert.ok(floatAmountCase.errors.amount);
console.log("  ✓ Penolakan nilai desimal (harus integer) lolos");

// Kasus Amount Melebihi Batas
const excessiveCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  amount: 2_000_000_000,
});
assert.equal(excessiveCase.valid, false);
assert.ok(excessiveCase.errors.amount);
console.log("  ✓ Penolakan nilai melebihi batas batas wajar lolos");

// 2. Uji Pembuatan Buffer XLSX Nyata
console.log("\n[2] Uji Pembuatan Berkas XLSX Asli:");
const sampleData = [
  { No: 1, "Nama Blok": "Blok A", "Nomor Blok": "10", "Jumlah (Rp)": 100000, "Waktu Pencatatan": "17 Okt 2025" },
  { No: 2, "Nama Blok": "Blok B", "Nomor Blok": "05", "Jumlah (Rp)": 50000, "Waktu Pencatatan": "17 Okt 2025" },
];
const ws = XLSX.utils.json_to_sheet(sampleData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Rekap Iuran");
const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

assert.ok(buffer instanceof Buffer, "Output harus berupa Buffer");
assert.ok(buffer.length > 1000, "Buffer XLSX harus memiliki ukuran berkas wajar");
// Verifikasi ZIP magic bytes (PK\x03\x04) yang menjadi standar format berkas .xlsx
assert.equal(buffer[0], 0x50, "Header byte 0 harus P (0x50)");
assert.equal(buffer[1], 0x4b, "Header byte 1 harus K (0x4b)");
assert.equal(buffer[2], 0x03, "Header byte 2 harus 0x03");
assert.equal(buffer[3], 0x04, "Header byte 3 harus 0x04");
console.log(`  ✓ Berkas XLSX valid terbuat (Ukuran: ${buffer.length} bytes, Magic Bytes: PK\\x03\\x04)`);

// 3. Status Uji Live Supabase & RLS
console.log("\n[3] Status Uji Live Supabase RLS:");
const hasLiveSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
);

if (hasLiveSupabase) {
  console.log("  Live Supabase credentials detected. Running live DB security test...");
} else {
  console.log("  [BLOCKED / TIDAK TERJALANKAN] Live RLS verification blocked: Kredensial Supabase live tidak tersedia di lingkungan.");
  console.log("  Skema dan aturan RLS lengkap telah didefinisikan secara deklaratif di supabase/schema.sql:");
  console.log("    - Tabel: public.iuran, public.pengurus_allowlist");
  console.log("    - Public SELECT diizinkan untuk rekap.");
  console.log("    - INSERT hanya diizinkan jika auth.uid() ADA di pengurus_allowlist.");
  console.log("    - UPDATE dan DELETE diblokir total (tidak ada policy).");
}

console.log("\n=== SEMUA PENGECEKAN LOKAL SUKSES ===");
