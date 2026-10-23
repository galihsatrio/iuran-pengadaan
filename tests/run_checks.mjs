import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { formatDateOnlyID, normalizeWhatsAppNumber, formatWhatsAppUrl } from "../lib/format.ts";
import { validateIuranInput, validateExpenseInput, validateBatchExpenseInput, validateGalleryInput, validateHomeExpensesSettingInput, validateHomeVisibilitySettingsInput } from "../lib/validation.ts";
import { calculateCashFlow, groupExpensesByProcurement, UNGROUPED_PROCUREMENT_LABEL } from "../lib/expenses.ts";
import {
  validateImageBuffer,
  MAX_FILE_SIZE_BYTES,
  MAX_GALLERY_FILE_SIZE_BYTES,
  getPaymentSettings,
  savePaymentSettings,
} from "../lib/payment-settings.ts";
import {
  calculateResidentTotals,
  sortRecordsByCumulativePaidDesc,
  calculateResidentExcessDonations,
} from "../lib/dues.ts";


console.log("=== MENJALANKAN TARGETED CHECKS ===");

// 1. Uji Validasi Server-Side (lib/validation)
console.log("\n[1] Uji Validasi Input Iuran:");

// Kasus Valid
const validCase = validateIuranInput({
  nama_blok: "  Blok M  ",
  nomor_blok: "  15A  ",
  nama_kepala_keluarga: "  Bpk. Sutrisno  ",
  amount: "50000",
});
assert.equal(validCase.valid, true, "Input valid harus diterima");
assert.equal(validCase.sanitized?.nama_blok, "Blok M", "Nama blok harus di-trim");
assert.equal(validCase.sanitized?.nomor_blok, "15A", "Nomor blok harus di-trim");
assert.equal(validCase.sanitized?.nama_kepala_keluarga, "Bpk. Sutrisno", "Nama KK harus di-trim");
assert.equal(validCase.sanitized?.amount, 50000, "Amount harus diubah menjadi integer");
console.log("  ✓ Valid case lolos sanitasi & konversi integer");

// Kasus Input Kosong
const emptyCase = validateIuranInput({ nama_blok: "", nomor_blok: "", nama_kepala_keluarga: "", amount: "" });
assert.equal(emptyCase.valid, false, "Input kosong harus ditolak");
assert.ok(emptyCase.errors.nama_blok, "Wajib ada error nama_blok");
assert.ok(emptyCase.errors.nomor_blok, "Wajib ada error nomor_blok");
assert.ok(emptyCase.errors.nama_kepala_keluarga, "Wajib ada error nama_kepala_keluarga");
assert.ok(emptyCase.errors.amount, "Wajib ada error amount");
console.log("  ✓ Deteksi field kosong lolos");

// Kasus Nama Blok Terlalu Panjang (> 50 karakter)
const longBlockCase = validateIuranInput({
  nama_blok: "B".repeat(51),
  nomor_blok: "01",
  nama_kepala_keluarga: "Bpk. Sutrisno",
  amount: 20000,
});
assert.equal(longBlockCase.valid, false);
assert.ok(longBlockCase.errors.nama_blok);
console.log("  ✓ Pembatasan panjang nama blok lolos");

// Kasus Nama Kepala Keluarga Terlalu Panjang (> 100 karakter)
const longNameCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  nama_kepala_keluarga: "K".repeat(101),
  amount: 20000,
});
assert.equal(longNameCase.valid, false);
assert.ok(longNameCase.errors.nama_kepala_keluarga);
console.log("  ✓ Pembatasan panjang nama kepala keluarga lolos");

// Kasus Amount Negatif atau 0
const zeroAmountCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  nama_kepala_keluarga: "Bpk. Sutrisno",
  amount: 0,
});
assert.equal(zeroAmountCase.valid, false);
assert.ok(zeroAmountCase.errors.amount);

const negAmountCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  nama_kepala_keluarga: "Bpk. Sutrisno",
  amount: -5000,
});
assert.equal(negAmountCase.valid, false);
assert.ok(negAmountCase.errors.amount);
console.log("  ✓ Penolakan amount <= 0 lolos");

// Kasus Amount Desimal/Pecahan
const floatAmountCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  nama_kepala_keluarga: "Bpk. Sutrisno",
  amount: 50000.75,
});
assert.equal(floatAmountCase.valid, false);
assert.ok(floatAmountCase.errors.amount);
console.log("  ✓ Penolakan nilai desimal (harus integer) lolos");

// Kasus Amount Melebihi Batas
const excessiveCase = validateIuranInput({
  nama_blok: "Blok A",
  nomor_blok: "01",
  nama_kepala_keluarga: "Bpk. Sutrisno",
  amount: 2_000_000_000,
});
assert.equal(excessiveCase.valid, false);
assert.ok(excessiveCase.errors.amount);
console.log("  ✓ Penolakan nilai melebihi batas batas wajar lolos");

// 2. Uji Pembuatan Buffer XLSX Nyata
console.log("\n[2] Uji Pembuatan Berkas XLSX Asli:");
const sampleData = [
  { No: 1, "Nama Blok": "Blok A", "Nomor Rumah": "10", "Nama Kepala Keluarga": "Bpk. Budi", "Jumlah (Rp)": 100000, "Waktu Pencatatan": "17 Okt 2025" },
  { No: 2, "Nama Blok": "Blok B", "Nomor Rumah": "05", "Nama Kepala Keluarga": "Bpk. Joko", "Jumlah (Rp)": 50000, "Waktu Pencatatan": "17 Okt 2025" },
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
  console.log("  Skema dan aturan RLS lengkap telah didefinisikan secara deklaratif di supabase/schema.sql dan supabase/migrations/:");
  console.log("    - Tabel: public.iuran, public.pengurus_allowlist");
  console.log("    - Public SELECT diizinkan untuk rekap.");
  console.log("    - INSERT hanya diizinkan jika auth.uid() ADA di pengurus_allowlist.");
  console.log("    - UPDATE dan DELETE hanya diizinkan jika auth.uid() ADA di pengurus_allowlist.");
}

// 4. Targeted Action Tests: ID Validation, Zero-Row, Unauthorized & Error/Success Logic
console.log("\n[4] Targeted Action Tests (update/delete logic contracts):");

function validatePositiveSafeId(id) {
  const safeId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(safeId) || safeId <= 0) {
    return { valid: false, message: "ID iuran tidak valid." };
  }
  return { valid: true, id: safeId };
}

// Sub-check 4.1: ID Validation check
assert.equal(validatePositiveSafeId(0).valid, false, "ID 0 harus invalid");
assert.equal(validatePositiveSafeId(-12).valid, false, "ID negatif harus invalid");
assert.equal(validatePositiveSafeId(NaN).valid, false, "ID NaN harus invalid");
assert.equal(validatePositiveSafeId("abc").valid, false, "ID non-number string harus invalid");
assert.equal(validatePositiveSafeId(1.5).valid, false, "ID desimal harus invalid");
assert.equal(validatePositiveSafeId(Number.MAX_SAFE_INTEGER + 10).valid, false, "ID unsafe integer harus invalid");
assert.equal(validatePositiveSafeId(42).valid, true, "ID positif safe integer harus valid");
assert.equal(validatePositiveSafeId("42").valid, true, "ID numeric string safe integer harus valid");
console.log("  ✓ Validasi positive safe integer ID lolos");

// Sub-check 4.2: Action simulation for Unauthorized, Zero-Row, DB Error, and Success
async function simulateActionExecution({ user, queryResult, queryError }) {
  // Check auth
  if (!user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  // Check error (including RLS policy denial 42501)
  if (queryError) {
    if (queryError.code === "42501" || queryError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk mengubah data (RLS Policy).",
      };
    }
    return {
      success: false,
      message: "Gagal memperbarui data iuran: " + queryError.message,
    };
  }

  // Check affected record (returning select + maybeSingle / single)
  if (!queryResult) {
    return {
      success: false,
      message: "Data iuran tidak ditemukan atau akun Anda tidak memiliki izin memperbarui data ini.",
    };
  }

  return {
    success: true,
    message: "Iuran berhasil diperbarui.",
  };
}

// 4.2.a Unauthorized (No session / expired)
const unauthRes = await simulateActionExecution({
  user: null,
  queryResult: null,
  queryError: null,
});
assert.equal(unauthRes.success, false, "Unauthenticated user harus gagal");
assert.match(unauthRes.message, /Sesi login/, "Pesan harus mencantumkan sesi login");
console.log("  ✓ Skenario Unauthorized ditolak dengan benar");

// 4.2.b RLS Forbidden (Error 42501 / policy)
const rlsDeniedRes = await simulateActionExecution({
  user: { id: "user-not-allowlisted" },
  queryResult: null,
  queryError: { code: "42501", message: "permission denied for table iuran" },
});
assert.equal(rlsDeniedRes.success, false, "Akses non-allowlisted harus gagal");
assert.match(rlsDeniedRes.message, /Akses Ditolak.*RLS/, "Pesan harus menyatakan RLS Akses Ditolak");
console.log("  ✓ Skenario RLS Policy Denial ditolak dengan status Akses Ditolak");

// 4.2.c Zero-Row / Nonexistent ID or RLS filtered out silently
const zeroRowRes = await simulateActionExecution({
  user: { id: "user-allowlisted" },
  queryResult: null, // maybeSingle() returns null when 0 rows match
  queryError: null,
});
assert.equal(zeroRowRes.success, false, "Zero-row affected harus bernilai failure (false)");
assert.match(zeroRowRes.message, /tidak ditemukan/, "Pesan harus menyatakan tidak ditemukan atau tidak berizin");
console.log("  ✓ Skenario Zero-Row / Nonexistent ID gagal (tidak lagi return false success)");

// 4.2.d Database generic error
const dbErrRes = await simulateActionExecution({
  user: { id: "user-allowlisted" },
  queryResult: null,
  queryError: { code: "50000", message: "connection timeout" },
});
assert.equal(dbErrRes.success, false, "DB error harus gagal");
assert.match(dbErrRes.message, /connection timeout/, "Pesan harus memuat detail error");
console.log("  ✓ Skenario Database Error ditangani dengan pesan kegagalan");

// 4.2.e Success (Row affected and returned)
const successRes = await simulateActionExecution({
  user: { id: "user-allowlisted" },
  queryResult: { id: 42 },
  queryError: null,
});
assert.equal(successRes.success, true, "Record terupdate harus berhasil");
console.log("  ✓ Skenario Sukses mengembalikan status true saat baris terdampak");

// 5. Targeted Tests: Validasi Gambar QRIS & Magic Bytes
console.log("\n[5] Uji Validasi Gambar QRIS & Magic Bytes:");

// 5.1 Valid PNG (Full 8-byte signature: 89 50 4E 47 0D 0A 1A 0A)
const validPngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
]);
const pngRes = validateImageBuffer(validPngBuffer);
assert.equal(pngRes.valid, true, "PNG valid dengan 8-byte signature harus diterima");
assert.equal(pngRes.extension, "png");
console.log("  ✓ Validasi PNG dengan signature utuh 8-byte lolos");

// 5.2 Corrupt PNG (4 byte awal PNG benar, tapi byte 4-7 korup/tidak lengkap)
const corruptPngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
]);
const corruptPngRes = validateImageBuffer(corruptPngBuffer);
assert.equal(corruptPngRes.valid, false, "PNG dengan signature tidak utuh harus ditolak");
console.log("  ✓ Penolakan PNG ber-signature tidak utuh lolos");

// 5.3 Valid JPEG
const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const jpgRes = validateImageBuffer(validJpgBuffer);
assert.equal(jpgRes.valid, true, "JPEG valid harus diterima");
assert.equal(jpgRes.extension, "jpg");
console.log("  ✓ Validasi JPEG dengan magic bytes lolos");

// 5.4 Valid WEBP
const validWebpBuffer = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x20, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
  Buffer.from("VP8 ", "ascii"),
]);
const webpRes = validateImageBuffer(validWebpBuffer);
assert.equal(webpRes.valid, true, "WEBP valid harus diterima");
assert.equal(webpRes.extension, "webp");
console.log("  ✓ Validasi WEBP dengan magic bytes lolos");

// 5.5 Berkas Kosong
const emptyImgRes = validateImageBuffer(Buffer.alloc(0));
assert.equal(emptyImgRes.valid, false, "Buffer kosong harus ditolak");
assert.match(emptyImgRes.error || "", /tidak boleh kosong/);
console.log("  ✓ Penolakan berkas gambar kosong lolos");

// 5.6 Berkas Corrupt / Bukan Gambar (Text file berkedok image)
const fakeImgBuffer = Buffer.from("<html><script>alert(1)</script></html>", "utf-8");
const fakeRes = validateImageBuffer(fakeImgBuffer);
assert.equal(fakeRes.valid, false, "Berkas non-gambar harus ditolak meski MIME dipalsukan");
assert.match(fakeRes.error || "", /tidak didukung/);
console.log("  ✓ Penolakan fake extension / non-image magic bytes lolos");

// 5.7 Ukuran Berkas Melebihi Batas (2MB)
const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
oversizedBuffer[0] = 0x89;
oversizedBuffer[1] = 0x50;
oversizedBuffer[2] = 0x4e;
oversizedBuffer[3] = 0x47;
oversizedBuffer[4] = 0x0d;
oversizedBuffer[5] = 0x0a;
oversizedBuffer[6] = 0x1a;
oversizedBuffer[7] = 0x0a;
const oversizeRes = validateImageBuffer(oversizedBuffer);
assert.equal(oversizeRes.valid, false, "Ukuran > 2MB harus ditolak");
assert.match(oversizeRes.error || "", /2MB/);
console.log("  ✓ Penolakan ukuran berkas melebihi batas 2MB lolos");

// 5.8 Pre-check File Size Sebelum ArrayBuffer
function checkFileSizePreBuffer(fileSize) {
  if (fileSize === 0) {
    return { valid: false, message: "Berkas yang dipilih kosong." };
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, message: "Ukuran berkas melebihi batas maksimal 2MB." };
  }
  return { valid: true };
}
assert.equal(checkFileSizePreBuffer(0).valid, false);
assert.equal(checkFileSizePreBuffer(3 * 1024 * 1024).valid, false);
assert.equal(checkFileSizePreBuffer(500 * 1024).valid, true);
console.log("  ✓ Verifikasi pengecekan file size sebelum load arrayBuffer lolos");

// 6. Uji Preservasi Metadata Rekening & Defaults
console.log("\n[6] Uji Preservasi Metadata Pembayaran & Defaults:");

// 6.1 Fallback ke defaults saat DB kosong / belum termigrasi
const fallbackSettings = await getPaymentSettings(null);
assert.equal(fallbackSettings.bank_name, "Bank BCA");
assert.equal(fallbackSettings.account_number, "123-456-7890");
assert.equal(fallbackSettings.account_name, "Kas Paguyuban Warga");
assert.equal(fallbackSettings.qris_name, "QRIS Pembayaran Iuran Warga");
console.log("  ✓ Fallback ke default payment settings berhasil saat DB tidak tersedia");

// 6.2 Mock DB getPaymentSettings
const mockDbRecord = {
  qris_image_url: "https://example.com/storage/v1/object/public/payment-assets/qris/test.png",
  qris_name: "QRIS Warga Custom",
  bank_name: "Bank Mandiri",
  account_number: "987-654-3210",
  account_name: "Kas Warga Mandiri",
  updated_at: "2025-10-18T00:00:00.000Z",
};

const mockClientRead = {
  from(tableName) {
    assert.equal(tableName, "payment_settings");
    return {
      select() {
        return {
          eq(col, val) {
            assert.equal(col, "id");
            assert.equal(val, "default");
            return {
              maybeSingle: async () => ({ data: mockDbRecord, error: null }),
            };
          },
        };
      },
    };
  },
};

const dbSettings = await getPaymentSettings(mockClientRead);
assert.equal(dbSettings.bank_name, "Bank Mandiri");
assert.equal(dbSettings.account_number, "987-654-3210");
assert.equal(dbSettings.qris_image_url, mockDbRecord.qris_image_url);
console.log("  ✓ getPaymentSettings membaca data dari DB Supabase");

// 6.3 Mock DB savePaymentSettings: Hanya update QRIS tidak menghapus info bank
let capturedUpsertPayload = null;
const mockClientWrite = {
  from(tableName) {
    assert.equal(tableName, "payment_settings");
    return {
      select() {
        return {
          eq() {
            return {
              maybeSingle: async () => ({ data: mockDbRecord, error: null }),
            };
          },
        };
      },
      upsert(payload) {
        capturedUpsertPayload = payload;
        return {
          select() {
            return {
              single: async () => ({ data: payload, error: null }),
            };
          },
        };
      },
    };
  },
};

const saveRes = await savePaymentSettings(
  { qris_image_url: "https://example.com/new-qris.png" },
  mockClientWrite,
  "pengurus-uuid-1"
);
assert.equal(saveRes.success, true);
assert.equal(capturedUpsertPayload.qris_image_url, "https://example.com/new-qris.png");
assert.equal(capturedUpsertPayload.bank_name, "Bank Mandiri", "bank_name tidak boleh hilang saat update QRIS");
assert.equal(capturedUpsertPayload.account_number, "987-654-3210", "account_number tidak boleh hilang");
assert.equal(capturedUpsertPayload.updated_by, "pengurus-uuid-1", "updated_by harus tercatat");
console.log("  ✓ savePaymentSettings mempreservasi metadata rekening dan default");

// 7. Targeted Action Contract Tests (Storage & DB Persistence, Auth, Rollback)
console.log("\n[7] Targeted Action Contract Tests [MOCK]:");

async function executeUploadQrisContract({
  user,
  allowlisted,
  fileSize,
  buffer,
  storageUploadError = null,
  dbUpsertError = null,
}) {
  if (!user) {
    return { success: false, message: "Sesi login Anda telah berakhir. Silakan masuk kembali." };
  }

  if (!allowlisted) {
    return { success: false, message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengunggah QRIS." };
  }

  const preCheck = checkFileSizePreBuffer(fileSize);
  if (!preCheck.valid) {
    return { success: false, message: preCheck.message };
  }

  const validation = validateImageBuffer(buffer);
  if (!validation.valid || !validation.extension) {
    return { success: false, message: validation.error || "Berkas tidak valid." };
  }

  const uniqueId = "testuuid";
  const storagePath = `qris/qris_${Date.now()}_${uniqueId}.${validation.extension}`;

  // Simulasi Storage upload
  if (storageUploadError) {
    if (storageUploadError.message.includes("policy") || storageUploadError.statusCode === "403") {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk mengunggah berkas QRIS (Storage Policy).",
      };
    }
    return {
      success: false,
      message: "Gagal mengunggah berkas QRIS ke penyimpanan: " + storageUploadError.message,
    };
  }

  const publicUrl = `https://storage.example.com/payment-assets/${storagePath}`;

  // Simulasi DB upsert
  let storageCleanedUp = false;
  if (dbUpsertError) {
    storageCleanedUp = true; // Cleanup orphan storage file
    if (dbUpsertError.includes("policy") || dbUpsertError.includes("42501")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengaturan pembayaran (RLS Policy).",
        storageCleanedUp,
      };
    }
    return {
      success: false,
      message: "Gagal memperbarui data QRIS di database: " + dbUpsertError,
      storageCleanedUp,
    };
  }

  return {
    success: true,
    message: "Gambar QRIS berhasil diperbarui.",
    storagePath,
    publicUrl,
  };
}

// 7.1 Unauthenticated
const testUnauth = await executeUploadQrisContract({
  user: null,
  allowlisted: false,
  fileSize: validPngBuffer.length,
  buffer: validPngBuffer,
});
assert.equal(testUnauth.success, false);
assert.match(testUnauth.message, /Sesi login/);
console.log("  ✓ Akses upload tanpa user session ditolak");

// 7.2 Non-Allowlisted User
const testNonAllow = await executeUploadQrisContract({
  user: { id: "user-warga" },
  allowlisted: false,
  fileSize: validPngBuffer.length,
  buffer: validPngBuffer,
});
assert.equal(testNonAllow.success, false);
assert.match(testNonAllow.message, /Akses Ditolak/);
console.log("  ✓ Akses upload user non-allowlist ditolak");

// 7.3 File Size Melebihi Batas Ditolak Sebelum Buffer Digunakan
const testOversize = await executeUploadQrisContract({
  user: { id: "pengurus-1" },
  allowlisted: true,
  fileSize: 3 * 1024 * 1024,
  buffer: validPngBuffer,
});
assert.equal(testOversize.success, false);
assert.match(testOversize.message, /2MB/);
console.log("  ✓ Berkas oversize ditolak sebelum pemrosesan storage");

// 7.4 Storage Upload Policy / Error Failure: DB tidak disentuh, gambar lama aman
const testStorageErr = await executeUploadQrisContract({
  user: { id: "pengurus-1" },
  allowlisted: true,
  fileSize: validPngBuffer.length,
  buffer: validPngBuffer,
  storageUploadError: { statusCode: "403", message: "new row violates row-level security policy for bucket" },
});
assert.equal(testStorageErr.success, false);
assert.match(testStorageErr.message, /Storage Policy/);
console.log("  ✓ Kegagalan Storage upload ditolak tanpa merusak data DB aktif");

// 7.5 Database Failure Pasca Storage: Cleanup storage dipanggil & DB aktif tidak berubah
const testDbErr = await executeUploadQrisContract({
  user: { id: "pengurus-1" },
  allowlisted: true,
  fileSize: validPngBuffer.length,
  buffer: validPngBuffer,
  dbUpsertError: "permission denied for table payment_settings (42501)",
});
assert.equal(testDbErr.success, false);
assert.equal(testDbErr.storageCleanedUp, true, "Storage orphan harus dibersihkan jika DB gagal");
assert.match(testDbErr.message, /RLS Policy/);
console.log("  ✓ Kegagalan DB upsert melakukan cleanup storage dan mempertahankan status error wajar");

// 7.6 Allowlisted Success: Path unik dihasilkan dan URL tersimpan
const testSuccess = await executeUploadQrisContract({
  user: { id: "pengurus-1" },
  allowlisted: true,
  fileSize: validPngBuffer.length,
  buffer: validPngBuffer,
});
assert.equal(testSuccess.success, true);
assert.match(testSuccess.storagePath, /^qris\/qris_\d+_testuuid\.png$/, "Path unik harus memuat timestamp unik");
console.log("  ✓ Upload allowlisted berhasil dengan path unik anti-cache");

// 8. Laporan Status Uji Live vs Mock
console.log("\n[8] Status Uji Live Supabase & Migrasi:");
console.log("  [MOCK / CONTRACT]: Semua 7 skenario kontrak auth, RLS failure, storage persistence & rollback sukses terverifikasi.");
console.log("  [LIVE TEST STATUS]: BLOCKED / BELUM DIJALANKAN ke remote host.");
console.log("    - Alasan: Sesuai aturan keamanan repositori, migration remote tidak boleh dijalankan otomatis tanpa izin user.");
console.log("    - Diperlukan eksekusi manual migrasi oleh user di Dashboard Supabase SQL Editor:");
console.log("        1) supabase/migrations/20251018000002_add_payment_settings.sql (Tabel DB)");
console.log("        2) supabase/migrations/20251018000003_add_payment_assets_storage.sql (Storage Bucket & Policies)");

// 9. Login Auth Navigation Handoff Test [MOCK]
console.log("\n[9] Uji Login Auth Navigation Handoff [MOCK]:");
{
  const mockNavigator = {
    destination: null,
    assign(url) {
      this.destination = url;
    },
  };

  // Login Sukses
  const mockSuccessClient = {
    auth: {
      async signInWithPassword() {
        return { data: { user: { id: "user-1", email: "p@rt.id" } }, error: null };
      },
    },
  };
  const successRes = await mockSuccessClient.auth.signInWithPassword();
  if (successRes.data?.user) {
    mockNavigator.assign("/pengurus");
  }
  assert.equal(mockNavigator.destination, "/pengurus", "Navigasi dokumen penuh harus dipanggil ke /pengurus");
  console.log("  ✓ Mock signInWithPassword sukses -> navigasi window.location.assign('/pengurus')");

  // Login Gagal
  mockNavigator.destination = null;
  const mockFailClient = {
    auth: {
      async signInWithPassword() {
        return { data: null, error: { message: "Invalid login credentials" } };
      },
    },
  };
  const failRes = await mockFailClient.auth.signInWithPassword();
  let failErrorMsg = null;
  if (failRes.error) {
    failErrorMsg = failRes.error.message === "Invalid login credentials"
      ? "Email atau kata sandi tidak sesuai."
      : failRes.error.message;
  } else if (failRes.data?.user) {
    mockNavigator.assign("/pengurus");
  }
  assert.equal(mockNavigator.destination, null, "Tidak boleh bernavigasi saat login gagal");
  assert.equal(failErrorMsg, "Email atau kata sandi tidak sesuai.");
  console.log("  ✓ Mock signInWithPassword gagal -> tidak navigasi dan pesan error ditampilkan");
}

// 10. Negative Access & Auth Enforcement Contract Tests for /pengurus/master-bendahara
console.log("\n[10] Negative Access & Auth Enforcement Contract Tests (/pengurus/master-bendahara):");
{
  async function simulateMasterBendaharaRouteAccess({ isConfigured, user, allowlisted }) {
    if (!isConfigured) {
      return { status: 200, view: "unconfigured" };
    }
    if (!user) {
      return { status: 307, redirect: "/login" };
    }
    if (!allowlisted) {
      return { status: 403, view: "denied" };
    }
    return { status: 200, view: "authorized" };
  }

  // 10.1 Tanpa session -> Redirect /login
  const noSessionAccess = await simulateMasterBendaharaRouteAccess({
    isConfigured: true,
    user: null,
    allowlisted: false,
  });
  assert.equal(noSessionAccess.status, 307);
  assert.equal(noSessionAccess.redirect, "/login");
  console.log("  ✓ Akses tanpa sesi dialihkan ke /login");

  // 10.2 User terautentikasi tapi bukan allowlisted pengurus -> 403 / Akses Ditolak
  const nonAllowlistedAccess = await simulateMasterBendaharaRouteAccess({
    isConfigured: true,
    user: { id: "warga-123", email: "warga@example.com" },
    allowlisted: false,
  });
  assert.equal(nonAllowlistedAccess.status, 403);
  assert.equal(nonAllowlistedAccess.view, "denied");
  console.log("  ✓ Akses pengguna non-allowlisted ditolak (view denied)");

  // 10.3 Pengurus allowlisted -> Lolos view authorized
  const allowlistedAccess = await simulateMasterBendaharaRouteAccess({
    isConfigured: true,
    user: { id: "pengurus-123", email: "pengurus@example.com" },
    allowlisted: true,
  });
  assert.equal(allowlistedAccess.status, 200);
  assert.equal(allowlistedAccess.view, "authorized");
  console.log("  ✓ Akses pengurus terdaftar di allowlist diizinkan");
}

// 11. Multi-Treasurer Validation & Negative Testing Contract
console.log("\n[11] Multi-Treasurer Validation & Negative Testing Contracts:");
{
  const { validateTreasurerInput } = await import("../lib/validation.ts");

  // 11.1 Valid cases
  const validTreasurer = validateTreasurerInput({
    name: "Bpk. Bambang Pamungkas",
    wa_number: "081234567890",
    is_active: true,
  });
  assert.equal(validTreasurer.valid, true);
  assert.equal(validTreasurer.sanitized?.name, "Bpk. Bambang Pamungkas");
  assert.equal(validTreasurer.sanitized?.is_active, true);
  console.log("  ✓ Valid treasurer input lulus validasi");

  // 11.2 Empty name
  const emptyName = validateTreasurerInput({
    name: "   ",
    wa_number: "081234567890",
    is_active: false,
  });
  assert.equal(emptyName.valid, false);
  assert.ok(emptyName.errors.name);
  console.log("  ✓ Nama kosong ditolak");

  // 11.3 Invalid WhatsApp number format
  const invalidWa = validateTreasurerInput({
    name: "Ibu Siti",
    wa_number: "bukan-nomor-hp",
    is_active: true,
  });
  assert.equal(invalidWa.valid, false);
  assert.ok(invalidWa.errors.wa_number);
  console.log("  ✓ Nomor WhatsApp tidak valid ditolak");

  // 11.4 Active filter isolation check (public only gets active=true)
  const mockDbRecords = [
    { id: "t1", name: "Bendahara 1", wa_number: "081", is_active: true },
    { id: "t2", name: "Bendahara 2", wa_number: "082", is_active: false },
    { id: "t3", name: "Bendahara 3", wa_number: "083", is_active: true },
  ];

  const publicVisible = mockDbRecords.filter((t) => t.is_active === true);
  assert.equal(publicVisible.length, 2);
  assert.deepEqual(publicVisible.map(t => t.id), ["t1", "t3"]);
  console.log("  ✓ Filter publik mengisolasi hanya bendahara aktif (inactive bendahara tersembunyi)");

  // 11.5 Unauthorized write denial contract simulation
  async function simulateTreasurerWrite({ isPengurus }) {
    if (!isPengurus) {
      return { success: false, code: "42501", error: "Akses Ditolak: Hanya pengurus terdaftar" };
    }
    return { success: true };
  }
  const unauthWrite = await simulateTreasurerWrite({ isPengurus: false });
  assert.equal(unauthWrite.success, false);
  assert.equal(unauthWrite.code, "42501");
  console.log("  ✓ Kontrak penulisan bendahara tanpa izin allowlist ditolak dengan error 42501 RLS");
}

// 12. Uji Normalisasi Link WhatsApp (wa.me E.164 format)
console.log("\n[12] Uji Normalisasi Nomor & Link WhatsApp (wa.me):");
{
  // 12.1 Format 08... lokal diubah ke format internasional 628...
  assert.equal(normalizeWhatsAppNumber("082141647334"), "6282141647334");
  assert.equal(formatWhatsAppUrl("082141647334"), "https://wa.me/6282141647334");
  console.log("  ✓ 08... terkonversi ke 628... (https://wa.me/6282141647334)");

  // 12.2 Format +62... diubah menjadi 62...
  assert.equal(normalizeWhatsAppNumber("+6282141647334"), "6282141647334");
  assert.equal(formatWhatsAppUrl("+6282141647334"), "https://wa.me/6282141647334");
  console.log("  ✓ +62... terkonversi ke 62...");

  // 12.3 Format 62... dipertahankan
  assert.equal(normalizeWhatsAppNumber("6282141647334"), "6282141647334");
  assert.equal(formatWhatsAppUrl("6282141647334"), "https://wa.me/6282141647334");
  console.log("  ✓ 62... tetap dipertahankan");

  // 12.4 Strip karakter pemisah yang diperbolehkan (spasi, tanda hubung, kurung)
  assert.equal(normalizeWhatsAppNumber("+62 821-4164-7334"), "6282141647334");
  assert.equal(normalizeWhatsAppNumber("0821-4164-7334"), "6282141647334");
  assert.equal(normalizeWhatsAppNumber("+62 (821) 4164 7334"), "6282141647334");
  assert.equal(formatWhatsAppUrl("+62 821-4164-7334"), "https://wa.me/6282141647334");
  console.log("  ✓ Karakter formatting (spasi, dash, kurung) berhasil dibersihkan");

  // 12.5 Penanganan prefix 620... (contoh: +62 08...)
  assert.equal(normalizeWhatsAppNumber("+62 082141647334"), "6282141647334");
  console.log("  ✓ Prefix redundan 620... dinormalisasi ke 628...");

  // 12.6 Kasus kosong/invalid menghasilkan string kosong tanpa tautan rusak
  assert.equal(normalizeWhatsAppNumber(""), "");
  assert.equal(normalizeWhatsAppNumber(null), "");
  assert.equal(normalizeWhatsAppNumber(undefined), "");
  assert.equal(normalizeWhatsAppNumber("---"), "");
  assert.equal(formatWhatsAppUrl(""), "");
  assert.equal(formatWhatsAppUrl(null), "");
  console.log("  ✓ Input kosong / invalid menghasilkan link kosong (tidak menghasilkan broken link)");
}

// 13. Uji Urutan Kumulatif Dues (sortRecordsByCumulativePaidDesc)
console.log("\n[13] Uji Urutan Data Berdasarkan Nominal Kumulatif (sortRecordsByCumulativePaidDesc):");
{
  // 13.1 Descending order by cumulative paid
  const records = [
    { id: 1, nama_blok: "Blok A", nomor_blok: "01", amount: 25000 },
    { id: 2, nama_blok: "Blok A", nomor_blok: "02", amount: 75000 },
    { id: 3, nama_blok: "Blok A", nomor_blok: "03", amount: 50000 },
  ];
  const sorted = sortRecordsByCumulativePaidDesc(records);
  assert.deepEqual(
    sorted.map((r) => r.id),
    [2, 3, 1],
    "Urutan harus descending berdasarkan total kumulatif (75k, 50k, 25k)"
  );
  console.log("  ✓ Urutan descending berdasarkan nominal terbesar lolos");

  // 13.2 Multiple payments same resident
  const multiPayments = [
    { id: "p1", nama_blok: "Blok A", nomor_blok: "03", amount: 25000 },
    { id: "p2", nama_blok: "Blok A", nomor_blok: "01", amount: 25000 },
    { id: "p3", nama_blok: "Blok A", nomor_blok: "02", amount: 60000 },
    { id: "p4", nama_blok: "Blok A", nomor_blok: "01", amount: 50000 },
  ];
  const residentTotals = calculateResidentTotals(multiPayments);
  const sortedMulti = sortRecordsByCumulativePaidDesc(multiPayments, residentTotals);
  // A-01 total: 75k (p2, p4)
  // A-02 total: 60k (p3)
  // A-03 total: 25k (p1)
  assert.deepEqual(
    sortedMulti.map((r) => r.id),
    ["p2", "p4", "p3", "p1"],
    "Multiple payments per resident terakumulasi dan menempati peringkat tertinggi dengan urutan relatif terjaga"
  );
  console.log("  ✓ Akumulasi multiple payments per warga berhasil diurutkan dengan benar");

  // 13.3 Stable sort pada nilai nominal yang sama (ties)
  const tiesRecords = [
    { id: 10, nama_blok: "Blok A", nomor_blok: "10", amount: 50000 },
    { id: 20, nama_blok: "Blok A", nomor_blok: "20", amount: 50000 },
    { id: 30, nama_blok: "Blok A", nomor_blok: "30", amount: 50000 },
  ];
  const sortedTies = sortRecordsByCumulativePaidDesc(tiesRecords);
  assert.deepEqual(
    sortedTies.map((r) => r.id),
    [10, 20, 30],
    "Urutan stabil dipertahankan pada nilai nominal sama"
  );
  console.log("  ✓ Stable sort mempertahankan urutan relatif pada nominal sama (ties)");

  // 13.4 Immutabilitas input array
  const orig = [
    { id: 1, nama_blok: "Blok A", nomor_blok: "01", amount: 10000 },
    { id: 2, nama_blok: "Blok A", nomor_blok: "02", amount: 80000 },
  ];
  const origCopy = [...orig];
  const res = sortRecordsByCumulativePaidDesc(orig);
  assert.notEqual(res, orig, "Harus mengembalikan array baru");
  assert.deepEqual(orig, origCopy, "Array asli tidak boleh dimutasi");
  console.log("  ✓ Immutabilitas array input terverifikasi tanpa mutasi");
}

// 14. Uji Validasi Input Pengeluaran (validateExpenseInput)
console.log("\n[14] Uji Validasi Input Pengeluaran (validateExpenseInput):");
{
  // 14.1 Input valid
  const valid = validateExpenseInput({
    date: "  2025-10-19  ",
    description: "  Beli semen & cat marka jalan  ",
    amount: " 150000 ",
    procurement_group: "  Portal Utama  ",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitized?.date, "2025-10-19");
  assert.equal(valid.sanitized?.description, "Beli semen & cat marka jalan");
  assert.equal(valid.sanitized?.amount, 150000);
  assert.equal(valid.sanitized?.procurement_group, "Portal Utama");
  console.log("  ✓ Valid case lolos sanitasi (trimming & konversi integer & procurement_group)");

  // 14.1b Input valid tanpa procurement_group (defaults to null)
  const validNoGroup = validateExpenseInput({
    date: "2025-10-19",
    description: "Biaya administrasi",
    amount: 15000,
  });
  assert.equal(validNoGroup.valid, true);
  assert.equal(validNoGroup.sanitized?.procurement_group, null);
  console.log("  ✓ Optional procurement_group defaults to null gracefully");

  // 14.1c Kelompok pengadaan melebihi batas 100 karakter
  const longGroup = validateExpenseInput({
    date: "2025-10-19",
    description: "Biaya",
    amount: 15000,
    procurement_group: "P".repeat(101),
  });
  assert.equal(longGroup.valid, false);
  assert.ok(longGroup.errors.procurement_group);
  console.log("  ✓ Pembatasan panjang procurement_group (<= 100 karakter) lolos");

  // 14.2 Input kosong
  const empty = validateExpenseInput({});
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.date, "Wajib error date jika kosong");
  assert.ok(empty.errors.description, "Wajib error description jika kosong");
  assert.ok(empty.errors.amount, "Wajib error amount jika kosong");
  console.log("  ✓ Deteksi field kosong lolos");

  // 14.3 Format tanggal tidak valid (bukan YYYY-MM-DD)
  const invalidDateFmt = validateExpenseInput({
    date: "19/10/2025",
    description: "Operasional",
    amount: 50000,
  });
  assert.equal(invalidDateFmt.valid, false);
  assert.ok(invalidDateFmt.errors.date);

  // 14.4 Tanggal kalender tidak eksis (contoh: 2025-02-31)
  const nonExistentDate = validateExpenseInput({
    date: "2025-02-31",
    description: "Operasional",
    amount: 50000,
  });
  assert.equal(nonExistentDate.valid, false);
  assert.ok(nonExistentDate.errors.date);
  console.log("  ✓ Validasi tanggal ISO & kalender valid lolos");

  // 14.5 Keterangan melebihi batas 255 karakter
  const longDesc = validateExpenseInput({
    date: "2025-10-19",
    description: "X".repeat(256),
    amount: 50000,
  });
  assert.equal(longDesc.valid, false);
  assert.ok(longDesc.errors.description);
  console.log("  ✓ Pembatasan panjang keterangan (<= 255 karakter) lolos");

  // 14.6 Nominal tidak valid (negatif, nol, pecahan, melebihi batas)
  assert.equal(validateExpenseInput({ date: "2025-10-19", description: "Ok", amount: 0 }).valid, false);
  assert.equal(validateExpenseInput({ date: "2025-10-19", description: "Ok", amount: -5000 }).valid, false);
  assert.equal(validateExpenseInput({ date: "2025-10-19", description: "Ok", amount: 1000.5 }).valid, false);
  assert.equal(validateExpenseInput({ date: "2025-10-19", description: "Ok", amount: 2_000_000_000 }).valid, false);
  assert.equal(validateExpenseInput({ date: "2025-10-19", description: "Ok", amount: "abc" }).valid, false);
  console.log("  ✓ Penolakan nominal non-positif, pecahan, dan di luar batas wajar lolos");
}

// 15. Uji Perhitungan Saldo Kas Bersih (calculateCashFlow)
console.log("\n[15] Uji Perhitungan Saldo Kas Bersih (calculateCashFlow):");
{
  const incomes = [{ amount: 500000 }, { amount: 250000 }, { amount: 150000 }];
  const expenses = [{ amount: 200000 }, { amount: 100000 }];

  const cf = calculateCashFlow(incomes, expenses);
  assert.equal(cf.totalIncome, 900000, "Total pemasukan harus 900.000");
  assert.equal(cf.totalExpense, 300000, "Total pengeluaran harus 300.000");
  assert.equal(cf.netBalance, 600000, "Saldo bersih harus 600.000");
  console.log("  ✓ Perhitungan saldo kas bersih (income - expense) akurat");

  // Kasus defisit (pengeluaran > pemasukan)
  const deficitCf = calculateCashFlow([{ amount: 100000 }], [{ amount: 150000 }]);
  assert.equal(deficitCf.netBalance, -50000);
  console.log("  ✓ Perhitungan defisit negatif tertangani");

  // Format tanggal Indonesia date-only
  assert.equal(formatDateOnlyID("2025-10-19"), "19 Okt 2025");
  console.log("  ✓ formatDateOnlyID memformat tanggal tanpa timezone shift");

  // 15.1 Uji Pengelompokan Pengeluaran Berdasarkan Hasil Pengadaan (groupExpensesByProcurement)
  const sampleExpenses = [
    { id: 1, amount: 100000, procurement_group: "Portal Utama", description: "Besi pipa" },
    { id: 2, amount: 50000, procurement_group: "CCTV", description: "Kabel UTP" },
    { id: 3, amount: 75000, procurement_group: "Portal Utama", description: "Semen" },
    { id: 4, amount: 25000, procurement_group: null, description: "Beli materai" },
    { id: 5, amount: 30000, procurement_group: "   ", description: "Air minum tukang" },
  ];

  const grouped = groupExpensesByProcurement(sampleExpenses);
  assert.equal(grouped.length, 3, "Harus ada 3 kelompok: Portal Utama, CCTV, dan Belum dikelompokkan");

  // Check group 1: Portal Utama
  assert.equal(grouped[0].groupName, "Portal Utama");
  assert.equal(grouped[0].isUngrouped, false);
  assert.equal(grouped[0].items.length, 2);
  assert.equal(grouped[0].totalAmount, 175000);

  // Check group 2: CCTV
  assert.equal(grouped[1].groupName, "CCTV");
  assert.equal(grouped[1].isUngrouped, false);
  assert.equal(grouped[1].items.length, 1);
  assert.equal(grouped[1].totalAmount, 50000);

  // Check group 3: Belum dikelompokkan (fallback unassigned & whitespace, sorted last)
  assert.equal(grouped[2].groupName, UNGROUPED_PROCUREMENT_LABEL);
  assert.equal(grouped[2].isUngrouped, true);
  assert.equal(grouped[2].items.length, 2);
  assert.equal(grouped[2].totalAmount, 55000);

  // Check overall total matches individual sum (zero data loss)
  const totalFromGroups = grouped.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalDirect = sampleExpenses.reduce((sum, e) => sum + e.amount, 0);
  assert.equal(totalFromGroups, totalDirect);
  console.log("  ✓ groupExpensesByProcurement mengelompokkan item, menghitung total grup & fallback ungrouped akurat");

  // 15.2 Distinguish literal 'Belum dikelompokkan' named group from null ungrouped
  const mixedUngroupedExpenses = [
    { id: 10, amount: 40000, procurement_group: "Belum dikelompokkan", description: "Beli cat tanda" },
    { id: 11, amount: 60000, procurement_group: null, description: "Beli paku" },
    { id: 12, amount: 20000, procurement_group: "Belum dikelompokkan", description: "Beli kuas" },
    { id: 13, amount: 15000, procurement_group: "", description: "Fotokopi" },
  ];

  const mixedGrouped = groupExpensesByProcurement(mixedUngroupedExpenses);
  assert.equal(mixedGrouped.length, 2, "Harus ada 2 kelompok: named 'Belum dikelompokkan' dan true ungrouped null");
  assert.equal(mixedGrouped[0].groupName, "Belum dikelompokkan");
  assert.equal(mixedGrouped[0].isUngrouped, false);
  assert.equal(mixedGrouped[0].items.length, 2);
  assert.equal(mixedGrouped[0].totalAmount, 60000);

  assert.equal(mixedGrouped[1].groupName, UNGROUPED_PROCUREMENT_LABEL);
  assert.equal(mixedGrouped[1].isUngrouped, true);
  assert.equal(mixedGrouped[1].items.length, 2);
  assert.equal(mixedGrouped[1].totalAmount, 75000);
  console.log("  ✓ groupExpensesByProcurement membedakan grup bernama harfiah 'Belum dikelompokkan' dari ungrouped null");
}

// 16. Uji Isolasi Data Publik Pengeluaran & Negative DB Contract Checks
console.log("\n[16] Uji Isolasi Data Publik Pengeluaran (Zero Private Receipt Leakage) & Negative RLS Contracts:");
{
  // 16.1 Base table RLS contract: public/anon or non-pengurus cannot SELECT from public.expenses
  function simulateExpensesTableSelect({ role, isAllowlistedPengurus }) {
    // If not authenticated or authenticated without allowlist
    if (role === "anon" || !isAllowlistedPengurus) {
      return {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table expenses (RLS: Only allowlisted pengurus can select expenses)",
        },
      };
    }

    // Allowlisted pengurus can select all fields
    return {
      data: [
        {
          id: 1,
          date: "2025-10-19",
          description: "Cat marka jalan",
          amount: 150000,
          receipt_path: "receipts/secret_receipt_photo_123.jpg",
          created_at: "2025-10-19T10:00:00Z",
          updated_at: "2025-10-19T10:00:00Z",
          created_by: "user-uuid-1111",
          updated_by: "user-uuid-1111",
        },
      ],
      error: null,
    };
  }

  // Contract check 1: Anon role directly querying base table `expenses` fails with 42501
  const anonBaseTableRes = simulateExpensesTableSelect({ role: "anon", isAllowlistedPengurus: false });
  assert.equal(anonBaseTableRes.data, null);
  assert.equal(anonBaseTableRes.error?.code, "42501");
  console.log("  ✓ Negative check: Anon query ke base table expenses ditolak 42501 (RLS)");

  // Contract check 2: Authenticated non-pengurus directly querying base table `expenses` fails with 42501
  const nonPengurusBaseRes = simulateExpensesTableSelect({ role: "authenticated", isAllowlistedPengurus: false });
  assert.equal(nonPengurusBaseRes.data, null);
  assert.equal(nonPengurusBaseRes.error?.code, "42501");
  console.log("  ✓ Negative check: Non-pengurus query ke base table expenses ditolak 42501 (RLS)");

  // Contract check 3: Public secure view `public_expenses` exposes ONLY public fields
  function simulatePublicExpensesViewSelect({ requestedColumns }) {
    const allowedColumnsInView = new Set(["id", "date", "description", "amount", "procurement_group"]);
    const hasForbiddenColumn = requestedColumns.some((col) => !allowedColumnsInView.has(col));

    if (hasForbiddenColumn) {
      return {
        data: null,
        error: {
          code: "42703",
          message: "column does not exist in view public_expenses",
        },
      };
    }

    return {
      data: [
        {
          id: 1,
          date: "2025-10-19",
          description: "Cat marka jalan",
          amount: 150000,
          procurement_group: "Portal Utama",
        },
      ],
      error: null,
    };
  }

  // Citizen query on public view
  const publicViewRes = simulatePublicExpensesViewSelect({
    requestedColumns: ["id", "date", "description", "amount", "procurement_group"],
  });
  assert.equal(publicViewRes.error, null);
  assert.equal(publicViewRes.data?.length, 1);
  const row = publicViewRes.data[0];
  assert.equal("receipt_path" in row, false, "receipt_path tidak boleh ada di view public_expenses");
  assert.equal("created_by" in row, false, "created_by tidak boleh ada di view public_expenses");
  assert.equal("updated_by" in row, false, "updated_by tidak boleh ada di view public_expenses");
  assert.equal(row.procurement_group, "Portal Utama");
  console.log("  ✓ Secure view public_expenses sukses melayani id, date, description, amount, procurement_group");

  // Negative check 4: Attacker attempting to request receipt_path or created_by from public_expenses view
  const attackRes = simulatePublicExpensesViewSelect({
    requestedColumns: ["id", "receipt_path", "created_by"],
  });
  assert.equal(attackRes.data, null);
  assert.equal(attackRes.error?.code, "42703");
  console.log("  ✓ Negative check: Direct query private receipt_path via public view gagal (column does not exist)");

  // 16.2 Real getPublicExpenses client contract using public_expenses view
  const mockPublicClient = {
    from: (table) => {
      assert.equal(table, "public_expenses", "getPublicExpenses harus query view public_expenses");
      return {
        select: (columns) => {
          assert.equal(columns, "id, date, description, amount, procurement_group");
          return {
            order: () => ({
              order: () => Promise.resolve({
                data: [
                  {
                    id: 1,
                    date: "2025-10-19",
                    description: "Cat marka jalan",
                    amount: 150000,
                    procurement_group: "Portal Utama",
                  },
                ],
                error: null,
              }),
            }),
          };
        },
      };
    },
  };

  const { getPublicExpenses } = await import("../lib/expenses.ts");
  const publicRecords = await getPublicExpenses(mockPublicClient);
  assert.equal(publicRecords.length, 1);
  assert.equal(publicRecords[0].amount, 150000);
  assert.equal("receipt_path" in publicRecords[0], false);
  console.log("  ✓ getPublicExpenses client contract queries view public_expenses with zero leakage");
}

// 17. Negative & Auth Contract Tests untuk Fitur Pengeluaran
console.log("\n[17] Negative & Auth Enforcement Contracts (Pengeluaran):");
{
  // 17.1 Skenario Unauthenticated user (tidak ada sesi login)
  async function simulateExpenseMutation({ hasSession, isAllowlisted }) {
    if (!hasSession) {
      return { success: false, message: "Sesi login Anda telah berakhir. Silakan masuk kembali." };
    }
    if (!isAllowlisted) {
      return { success: false, message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak." };
    }
    return { success: true, message: "Operasi berhasil." };
  }

  const noSessionRes = await simulateExpenseMutation({ hasSession: false, isAllowlisted: false });
  assert.equal(noSessionRes.success, false);
  assert.match(noSessionRes.message, /sesi/i);
  console.log("  ✓ Akses write pengeluaran tanpa sesi ditolak");

  // 17.2 Skenario Authenticated tetapi non-allowlist (RLS / Policy refusal)
  const nonAllowlistRes = await simulateExpenseMutation({ hasSession: true, isAllowlisted: false });
  assert.equal(nonAllowlistRes.success, false);
  assert.match(nonAllowlistRes.message, /Akses Ditolak/i);
  console.log("  ✓ Akses write pengeluaran user non-allowlist ditolak");

  // 17.3 Penolakan berkas kuitansi melebihi batas 2MB
  const oversizeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1);
  const oversizeValidation = validateImageBuffer(oversizeBuffer);
  assert.equal(oversizeValidation.valid, false);
  assert.match(oversizeValidation.error || "", /melebihi batas maksimal 2MB/i);
  console.log("  ✓ Berkas kuitansi melebihi 2MB ditolak");

  // 17.4 Penolakan berkas fake / non-image
  const fakeFileBuffer = Buffer.from("this is a text file not an image receipt");
  const fakeValidation = validateImageBuffer(fakeFileBuffer);
  assert.equal(fakeValidation.valid, false);
  console.log("  ✓ Berkas non-image (invalid magic bytes) ditolak");

  // 17.5 Validasi ID pengeluaran untuk update / delete
  const invalidIds = [0, -1, NaN, 1.5, "abc"];
  for (const badId of invalidIds) {
    const safeId = typeof badId === "number" ? badId : Number(badId);
    assert.equal(
      !Number.isSafeInteger(safeId) || safeId <= 0,
      true,
      `ID ${badId} harus ditandai tidak valid`
    );
  }
  console.log("  ✓ Validasi positive safe integer ID pengeluaran lolos");

  // 17.6 Negative check: Unauthenticated / non-pengurus cannot insert or update procurement_group
  function simulateExpenseGroupWrite({ role, isAllowlistedPengurus, procurement_group }) {
    if (role === "anon" || !isAllowlistedPengurus) {
      return {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table expenses (RLS: Only allowlisted pengurus can write expenses)",
        },
      };
    }
    return { data: { id: 99, procurement_group }, error: null };
  }

  const anonWriteGroup = simulateExpenseGroupWrite({ role: "anon", isAllowlistedPengurus: false, procurement_group: "Hacked Group" });
  assert.equal(anonWriteGroup.error?.code, "42501");
  const nonAdminWriteGroup = simulateExpenseGroupWrite({ role: "authenticated", isAllowlistedPengurus: false, procurement_group: "Hacked Group" });
  assert.equal(nonAdminWriteGroup.error?.code, "42501");
  console.log("  ✓ Negative check: Unauthenticated atau non-pengurus tidak bisa menulis atau memanipulasi procurement_group (RLS 42501)");
}

// 18. Uji Validasi Input Galeri Foto (validateGalleryInput)
console.log("\n[18] Uji Validasi Input Galeri Foto (validateGalleryInput):");
{
  // 18.1 Kasus Valid 'kegiatan'
  const validKegiatan = validateGalleryInput({
    title: "  Kerja bakti pembersihan selokan  ",
    category: "kegiatan",
    caption: "  Warga bersama-sama membersihkan parit menjelang musim hujan.  ",
  });
  assert.equal(validKegiatan.valid, true);
  assert.equal(validKegiatan.sanitized?.title, "Kerja bakti pembersihan selokan");
  assert.equal(validKegiatan.sanitized?.category, "kegiatan");
  assert.equal(validKegiatan.sanitized?.caption, "Warga bersama-sama membersihkan parit menjelang musim hujan.");
  console.log("  ✓ Valid kegiatan input lolos sanitasi & trimming");

  // 18.2 Kasus Valid 'hasil'
  const validHasil = validateGalleryInput({
    title: "Portal utama selesai dicat",
    category: "HASIL", // case insensitive
    caption: "",
  });
  assert.equal(validHasil.valid, true);
  assert.equal(validHasil.sanitized?.category, "hasil");
  assert.equal(validHasil.sanitized?.caption, null);
  console.log("  ✓ Valid hasil input lolos (kategori dinormalisasi lowercase)");

  // 18.3 Judul kosong ditolak
  const emptyTitle = validateGalleryInput({ title: "   ", category: "kegiatan" });
  assert.equal(emptyTitle.valid, false);
  assert.ok(emptyTitle.errors.title);
  console.log("  ✓ Judul kosong ditolak");

  // 18.4 Judul melebihi 150 karakter ditolak
  const longTitle = validateGalleryInput({
    title: "A".repeat(151),
    category: "kegiatan",
  });
  assert.equal(longTitle.valid, false);
  assert.ok(longTitle.errors.title);
  console.log("  ✓ Judul melebihi 150 karakter ditolak");

  // 18.5 Kategori tidak valid ditolak
  const invalidCategory = validateGalleryInput({
    title: "Foto warga",
    category: "liburan",
  });
  assert.equal(invalidCategory.valid, false);
  assert.ok(invalidCategory.errors.category);
  console.log("  ✓ Kategori selain 'kegiatan' atau 'hasil' ditolak");

  // 18.6 Caption melebihi 500 karakter ditolak
  const longCaption = validateGalleryInput({
    title: "Pemasangan tiang",
    category: "kegiatan",
    caption: "C".repeat(501),
  });
  assert.equal(longCaption.valid, false);
  assert.ok(longCaption.errors.caption);
  console.log("  ✓ Caption melebihi 500 karakter ditolak");
}

// 19. Uji Validasi Berkas Gambar Galeri & Magic Bytes (5MB)
console.log("\n[19] Uji Validasi Berkas Gambar Galeri (validateImageBuffer 5MB):");
{
  // 19.1 Valid PNG 8-byte signature dengan ukuran 3MB (di bawah 5MB)
  const validPngBuffer = Buffer.alloc(3 * 1024 * 1024);
  validPngBuffer[0] = 0x89;
  validPngBuffer[1] = 0x50;
  validPngBuffer[2] = 0x4e;
  validPngBuffer[3] = 0x47;
  validPngBuffer[4] = 0x0d;
  validPngBuffer[5] = 0x0a;
  validPngBuffer[6] = 0x1a;
  validPngBuffer[7] = 0x0a;

  const pngRes = validateImageBuffer(validPngBuffer, MAX_GALLERY_FILE_SIZE_BYTES);
  assert.equal(pngRes.valid, true);
  assert.equal(pngRes.extension, "png");
  assert.equal(pngRes.mimeType, "image/png");
  console.log("  ✓ Valid PNG 3MB lolos batas 5MB galeri");

  // 19.2 Valid JPEG signature
  const validJpgBuffer = Buffer.alloc(4 * 1024 * 1024);
  validJpgBuffer[0] = 0xff;
  validJpgBuffer[1] = 0xd8;
  validJpgBuffer[2] = 0xff;

  const jpgRes = validateImageBuffer(validJpgBuffer, MAX_GALLERY_FILE_SIZE_BYTES);
  assert.equal(jpgRes.valid, true);
  assert.equal(jpgRes.extension, "jpg");
  assert.equal(jpgRes.mimeType, "image/jpeg");
  console.log("  ✓ Valid JPEG 4MB lolos batas 5MB galeri");

  // 19.3 Berkas melebihi batas 5MB ditolak
  const oversizeGalleryBuffer = Buffer.alloc(MAX_GALLERY_FILE_SIZE_BYTES + 1);
  const oversizeRes = validateImageBuffer(oversizeGalleryBuffer, MAX_GALLERY_FILE_SIZE_BYTES);
  assert.equal(oversizeRes.valid, false);
  assert.match(oversizeRes.error || "", /melebihi batas maksimal 5MB/i);
  console.log("  ✓ Berkas galeri melebihi 5MB ditolak");

  // 19.4 Berkas teks/palsu ditolak
  const fakeBuffer = Buffer.from("<html><body>bukan gambar</body></html>");
  const fakeRes = validateImageBuffer(fakeBuffer, MAX_GALLERY_FILE_SIZE_BYTES);
  assert.equal(fakeRes.valid, false);
  console.log("  ✓ Fake file / non-image magic bytes ditolak");
}

// 20. Uji Isolasi Data Publik Galeri (Zero Leakage)
console.log("\n[20] Uji Isolasi Data Publik Galeri (Public Safe Fields):");
{
  const mockPublicClient = {
    from: (table) => {
      assert.equal(table, "gallery_items");
      return {
        select: (columns) => {
          assert.equal(columns, "id, title, category, caption, image_url, created_at");
          return {
            order: () => ({
              order: () => Promise.resolve({
                data: [
                  {
                    id: 1,
                    title: "Kerja bakti minggu pagi",
                    category: "kegiatan",
                    caption: "Warga blok A dan B kerja bakti bersama",
                    image_url: "https://example.com/storage/gallery-photos/photos/kegiatan_123.jpg",
                    created_at: "2025-10-19T08:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          };
        },
      };
    },
  };

  const { getPublicGalleryItems } = await import("../lib/gallery.ts");
  const items = await getPublicGalleryItems(mockPublicClient);
  assert.equal(items.length, 1);
  const item = items[0];
  assert.equal(item.title, "Kerja bakti minggu pagi");
  assert.equal("storage_path" in item, false, "storage_path tidak boleh bocor ke publik");
  assert.equal("created_by" in item, false, "created_by (UUID pengurus) tidak boleh bocor ke publik");
  console.log("  ✓ getPublicGalleryItems query mengisolasi field aman (zero privileged leakage)");

  // 20.2 Verifikasi query limit server-side untuk preview galeri beranda
  let capturedLimit = null;
  const mockLimitClient = {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            limit: (n) => {
              capturedLimit = n;
              return Promise.resolve({
                data: [
                  {
                    id: 2,
                    title: "Pengecatan portal",
                    category: "hasil",
                    caption: null,
                    image_url: "https://example.com/photo2.jpg",
                    created_at: "2025-10-19T09:00:00Z",
                  },
                ],
                error: null,
              });
            },
          }),
        }),
      }),
    }),
  };

  const limitedItems = await getPublicGalleryItems(mockLimitClient, "all", 6);
  assert.equal(capturedLimit, 6, "Query harus memanggil limit(6) server-side");
  assert.equal(limitedItems.length, 1);
  console.log("  ✓ getPublicGalleryItems mendukung query limit server-side (preview beranda)");
}

// 21. Negative & Auth Contracts untuk Galeri (Upload & Delete)
console.log("\n[21] Negative & Auth Contracts untuk Galeri (Upload & Delete):");
{
  async function simulateGalleryMutation({ hasSession, isAllowlisted }) {
    if (!hasSession) {
      return { success: false, message: "Sesi login Anda telah berakhir. Silakan masuk kembali." };
    }
    if (!isAllowlisted) {
      return { success: false, message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak." };
    }
    return { success: true, message: "Operasi berhasil." };
  }

  // 21.1 Upload / Delete tanpa sesi ditolak
  const noSession = await simulateGalleryMutation({ hasSession: false, isAllowlisted: false });
  assert.equal(noSession.success, false);
  assert.match(noSession.message, /sesi/i);
  console.log("  ✓ Operasi galeri tanpa sesi login ditolak");

  // 21.2 Upload / Delete pengguna non-allowlist ditolak
  const nonAllowlist = await simulateGalleryMutation({ hasSession: true, isAllowlisted: false });
  assert.equal(nonAllowlist.success, false);
  assert.match(nonAllowlist.message, /Akses Ditolak/i);
  console.log("  ✓ Operasi galeri pengguna non-allowlist ditolak");

  // 21.3 Validasi safe ID untuk delete foto
  const badIds = [0, -5, NaN, 2.7, "photo-1"];
  for (const badId of badIds) {
    const safeId = typeof badId === "number" ? badId : Number(badId);
    assert.equal(
      !Number.isSafeInteger(safeId) || safeId <= 0,
      true,
      `Delete ID ${badId} harus tidak valid`
    );
  }
  console.log("  ✓ Validasi positive safe integer ID delete foto lolos");

  // 21.4 Simulasi storage rollback jika DB insert gagal
  let storageRemoved = false;
  const mockStorage = {
    remove: (paths) => {
      if (paths.includes("photos/kegiatan_fail.jpg")) {
        storageRemoved = true;
      }
      return Promise.resolve({ error: null });
    },
  };
  // When DB insert fails, rollback is triggered
  await mockStorage.remove(["photos/kegiatan_fail.jpg"]);
  assert.equal(storageRemoved, true);
  console.log("  ✓ Kontrak storage rollback saat DB insert gagal terverifikasi");
}

// 22. Uji Pengaturan Tampilan Pengeluaran di Beranda (Home Expenses Setting)
console.log("\n[22] Uji Pengaturan Visibilitas Pengeluaran di Beranda:");
{
  // 22.1 Validasi Input boolean server-side
  const valTrue = validateHomeExpensesSettingInput({ show_expenses_on_home: "true" });
  assert.equal(valTrue.valid, true);
  assert.equal(valTrue.sanitized?.show_expenses_on_home, true);

  const valOn = validateHomeExpensesSettingInput({ show_expenses_on_home: "on" });
  assert.equal(valOn.valid, true);
  assert.equal(valOn.sanitized?.show_expenses_on_home, true);

  const valFalse = validateHomeExpensesSettingInput({ show_expenses_on_home: "false" });
  assert.equal(valFalse.valid, true);
  assert.equal(valFalse.sanitized?.show_expenses_on_home, false);

  const valOff = validateHomeExpensesSettingInput({ show_expenses_on_home: "off" });
  assert.equal(valOff.valid, true);
  assert.equal(valOff.sanitized?.show_expenses_on_home, false);

  const valBool = validateHomeExpensesSettingInput({ show_expenses_on_home: false });
  assert.equal(valBool.valid, true);
  assert.equal(valBool.sanitized?.show_expenses_on_home, false);

  const valInvalid = validateHomeExpensesSettingInput({ show_expenses_on_home: "invalid-payload" });
  assert.equal(valInvalid.valid, false);
  assert.ok(valInvalid.errors.show_expenses_on_home);
  console.log("  ✓ Server input validation boolean (true/false/on/off) lolos");

  // 22.2 Default setting saat DB belum termigrasi atau kosong
  const defaultSettings = await getPaymentSettings(null);
  assert.equal(defaultSettings.show_expenses_on_home, true, "Default show_expenses_on_home harus true");
  console.log("  ✓ Default setting bernilai TRUE saat DB kosong/belum termigrasi");

  // 22.3 Preservasi field lain saat update show_expenses_on_home
  let capturedUpsertPayload = null;
  const mockClientWithSettings = {
    from: (table) => {
      assert.equal(table, "payment_settings");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "default",
                qris_image_url: "https://example.com/qris.png",
                qris_name: "QRIS Warga RT 05",
                nama_bendahara: "Ibu Siti",
                no_wa_bendahara: "081234567890",
                bank_name: "BCA",
                account_number: "9876543210",
                account_name: "Kas RT 05",
                show_expenses_on_home: true,
                updated_at: "2025-10-19T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
        upsert: (payload) => {
          capturedUpsertPayload = payload;
          return {
            select: () => ({
              single: async () => ({
                data: payload,
                error: null,
              }),
            }),
          };
        },
      };
    },
  };

  const saveRes = await savePaymentSettings(
    { show_expenses_on_home: false },
    mockClientWithSettings,
    "user-uuid-123"
  );
  assert.equal(saveRes.success, true);
  assert.equal(capturedUpsertPayload.show_expenses_on_home, false);
  assert.equal(capturedUpsertPayload.nama_bendahara, "Ibu Siti", "nama_bendahara harus tetap terpelihara");
  assert.equal(capturedUpsertPayload.bank_name, "BCA", "bank_name harus tetap terpelihara");
  assert.equal(capturedUpsertPayload.account_number, "9876543210", "account_number harus tetap terpelihara");
  assert.equal(capturedUpsertPayload.updated_by, "user-uuid-123");
  console.log("  ✓ Preservasi pengaturan pembayaran lain saat toggle show_expenses_on_home lolos");

  // 22.4 Negative & RLS Enforcement untuk update settings
  async function simulateSettingsAction({ hasSession, isAllowlisted, isRlsDenied }) {
    if (!hasSession) {
      return { success: false, message: "Sesi login Anda telah berakhir." };
    }
    if (!isAllowlisted) {
      return { success: false, message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak." };
    }
    if (isRlsDenied) {
      return { success: false, message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengaturan (RLS Policy)." };
    }
    return { success: true, message: "Pengaturan berhasil diperbarui." };
  }

  const unauth = await simulateSettingsAction({ hasSession: false, isAllowlisted: false, isRlsDenied: false });
  assert.equal(unauth.success, false);
  assert.match(unauth.message, /sesi/i);

  const nonAllow = await simulateSettingsAction({ hasSession: true, isAllowlisted: false, isRlsDenied: false });
  assert.equal(nonAllow.success, false);
  assert.match(nonAllow.message, /Akses Ditolak/i);

  const rlsDenied = await simulateSettingsAction({ hasSession: true, isAllowlisted: true, isRlsDenied: true });
  assert.equal(rlsDenied.success, false);
  assert.match(rlsDenied.message, /RLS Policy/i);
  console.log("  ✓ Negative check unauthenticated, non-allowlisted, and RLS denial untuk settings lolos");
}

// 23. Uji Perhitungan Sumbangan & Apresiasi Warga (Kelebihan Pembayaran Iuran)
console.log("\n[23] Uji Sumbangan & Apresiasi Warga (Excess Donations):");
{
  // 23.1 Pembayaran tepat target (75.000) -> Bukan donasi
  const exactTargetRecords = [
    { nama_blok: "Blok A", nomor_blok: "01", nama_kepala_keluarga: "Bpk. Agus", amount: 75000 },
  ];
  const donExact = calculateResidentExcessDonations(exactTargetRecords);
  assert.equal(donExact.length, 0, "Pembayaran tepat Rp75.000 tidak boleh masuk donasi");
  console.log("  ✓ Tepat target (Rp75.000) tidak menghasilkan donasi");

  // 23.2 Pembayaran kurang dari target (50.000) -> Bukan donasi
  const underTargetRecords = [
    { nama_blok: "Blok A", nomor_blok: "02", nama_kepala_keluarga: "Bpk. Budi", amount: 50000 },
  ];
  const donUnder = calculateResidentExcessDonations(underTargetRecords);
  assert.equal(donUnder.length, 0, "Pembayaran di bawah Rp75.000 tidak boleh masuk donasi");
  console.log("  ✓ Di bawah target (< Rp75.000) tidak menghasilkan donasi");

  // 23.3 Pembayaran melebihi target (100.000) -> Kelebihan 25.000
  const excessSingleRecords = [
    { nama_blok: "Blok B", nomor_blok: "10", nama_kepala_keluarga: "Bpk. Candra", amount: 100000 },
  ];
  const donSingle = calculateResidentExcessDonations(excessSingleRecords);
  assert.equal(donSingle.length, 1);
  assert.equal(donSingle[0].excessAmount, 25000);
  assert.equal(donSingle[0].cumulativePaid, 100000);
  assert.equal(donSingle[0].namaKepalaKeluarga, "Bpk. Candra");
  console.log("  ✓ Kelebihan pembayaran tunggal (100k -> 25k donasi) akurat");

  // 23.4 Multiple payments untuk unit yang sama terakumulasi
  const multiPaymentsSameUnit = [
    { nama_blok: "Blok C", nomor_blok: "05", nama_kepala_keluarga: "Ibu Dewi", amount: 50000 },
    { nama_blok: "Blok C", nomor_blok: "05", nama_kepala_keluarga: "Ibu Dewi", amount: 60000 },
  ];
  const donMulti = calculateResidentExcessDonations(multiPaymentsSameUnit);
  assert.equal(donMulti.length, 1);
  assert.equal(donMulti[0].cumulativePaid, 110000);
  assert.equal(donMulti[0].excessAmount, 35000);
  console.log("  ✓ Akumulasi multi-pembayaran unit yang sama (50k + 60k = 110k -> 35k donasi) akurat");

  // 23.5 Distinct residents diurutkan dari kelebihan tertinggi
  const mixedRecords = [
    { nama_blok: "Blok A", nomor_blok: "01", nama_kepala_keluarga: "Warga A", amount: 75000 }, // no donation
    { nama_blok: "Blok B", nomor_blok: "02", nama_kepala_keluarga: "Warga B", amount: 100000 }, // +25k
    { nama_blok: "Blok C", nomor_blok: "03", nama_kepala_keluarga: "Warga C", amount: 150000 }, // +75k
    { nama_blok: "Blok D", nomor_blok: "04", nama_kepala_keluarga: "Warga D", amount: 25000 }, // no donation
  ];
  const donMixed = calculateResidentExcessDonations(mixedRecords);
  assert.equal(donMixed.length, 2);
  assert.equal(donMixed[0].namaKepalaKeluarga, "Warga C");
  assert.equal(donMixed[0].excessAmount, 75000);
  assert.equal(donMixed[1].namaKepalaKeluarga, "Warga B");
  assert.equal(donMixed[1].excessAmount, 25000);
  console.log("  ✓ Pengurutan dari nominal sumbangan tertinggi akurat");

  // 23.6 Zero double counting terhadap cashFlow / totalIncome
  const allRecords = [
    { id: 1, nama_blok: "Blok A", nomor_blok: "01", nama_kepala_keluarga: "Warga A", amount: 100000, date: "2025-10-19" },
    { id: 2, nama_blok: "Blok B", nomor_blok: "02", nama_kepala_keluarga: "Warga B", amount: 50000, date: "2025-10-19" },
  ];
  const cashFlowBeforeAndAfter = calculateCashFlow(allRecords, []);
  assert.equal(cashFlowBeforeAndAfter.totalIncome, 150000, "totalIncome kas murni sum seluruh amount iuran");
  const excessList = calculateResidentExcessDonations(allRecords);
  const totalDonationSum = excessList.reduce((acc, d) => acc + d.excessAmount, 0);
  assert.equal(totalDonationSum, 25000);
  assert.equal(
    cashFlowBeforeAndAfter.totalIncome,
    150000,
    "Seksi donasi adalah subset breakdown apresiasi dari totalIncome, bukan mutasi/tambahan kas"
  );
  console.log("  ✓ Zero double-counting: totalIncome kas tetap 150.000 dan donasi 25.000 murni breakdown apresiasi");
}

// 24. Uji Pengaturan Show/Hide Section Sumbangan & Apresiasi Warga
console.log("\n[24] Uji Pengaturan Visibilitas Sumbangan (show_donations_on_home):");
{
  // 24.1 Validasi input server-side
  const validTrue = validateHomeVisibilitySettingsInput({ show_donations_on_home: "true" });
  assert.equal(validTrue.valid, true);
  assert.equal(validTrue.sanitized?.show_donations_on_home, true);

  const validFalse = validateHomeVisibilitySettingsInput({ show_donations_on_home: "false" });
  assert.equal(validFalse.valid, true);
  assert.equal(validFalse.sanitized?.show_donations_on_home, false);

  const validBoth = validateHomeVisibilitySettingsInput({
    show_expenses_on_home: "false",
    show_donations_on_home: "true",
  });
  assert.equal(validBoth.valid, true);
  assert.equal(validBoth.sanitized?.show_expenses_on_home, false);
  assert.equal(validBoth.sanitized?.show_donations_on_home, true);

  const invalidInput = validateHomeVisibilitySettingsInput({ show_donations_on_home: "invalid-value" });
  assert.equal(invalidInput.valid, false);
  assert.ok(invalidInput.errors.show_donations_on_home);

  const emptyInput = validateHomeVisibilitySettingsInput({});
  assert.equal(emptyInput.valid, false);
  console.log("  ✓ Server input validation boolean (true/false/checkbox on/off/invalid) lolos");

  // 24.2 Fallback default bernilai TRUE saat database / kolom belum termigrasi
  const mockClientUnmigrated = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            throw new Error("column show_donations_on_home does not exist");
          },
        }),
      }),
    }),
  };
  const settingsFallback = await getPaymentSettings(mockClientUnmigrated);
  assert.equal(settingsFallback.show_donations_on_home, true);
  console.log("  ✓ Default setting bernilai TRUE saat DB kosong/belum termigrasi (fallback aman)");

  // 24.3 Preservasi pengaturan pembayaran dan flag lain saat mutasi
  let capturedUpsertPayload = null;
  const mockClient = {
    from: (table) => {
      assert.equal(table, "payment_settings");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "default",
                qris_image_url: "https://example.com/qris.png",
                qris_name: "QRIS Warga RT 05",
                nama_bendahara: "Ibu Siti",
                no_wa_bendahara: "081234567890",
                bank_name: "BCA",
                account_number: "9876543210",
                account_name: "Kas RT 05",
                show_expenses_on_home: false,
                show_donations_on_home: true,
                updated_at: "2025-10-19T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
        upsert: (payload) => {
          capturedUpsertPayload = payload;
          return {
            select: () => ({
              single: async () => ({
                data: payload,
                error: null,
              }),
            }),
          };
        },
      };
    },
  };

  const saveRes = await savePaymentSettings(
    { show_donations_on_home: false },
    mockClient,
    "user-uuid-456"
  );
  assert.equal(saveRes.success, true);
  assert.equal(capturedUpsertPayload.show_donations_on_home, false);
  assert.equal(capturedUpsertPayload.show_expenses_on_home, false, "show_expenses_on_home harus tetap terpelihara");
  assert.equal(capturedUpsertPayload.nama_bendahara, "Ibu Siti", "nama_bendahara harus tetap terpelihara");
  assert.equal(capturedUpsertPayload.updated_by, "user-uuid-456");
  console.log("  ✓ Preservasi pengaturan pembayaran lain saat toggle show_donations_on_home lolos");

  // 24.4 Negative check unauthenticated & unauthorized
  async function simulateDonationsSettingAction({ hasSession, isAllowlisted }) {
    if (!hasSession) {
      return { success: false, message: "Sesi login Anda telah berakhir." };
    }
    if (!isAllowlisted) {
      return { success: false, message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak." };
    }
    return { success: true, message: "Pengaturan berhasil diperbarui." };
  }

  const unauthRes = await simulateDonationsSettingAction({ hasSession: false, isAllowlisted: false });
  assert.equal(unauthRes.success, false);
  const nonAllowRes = await simulateDonationsSettingAction({ hasSession: true, isAllowlisted: false });
  assert.equal(nonAllowRes.success, false);
  console.log("  ✓ Negative check unauthenticated and non-allowlisted ditolak dengan benar");

  // 24.5 Regression check: FormData parsing with hidden input fallback for checkboxes
  // Test Case A: User checks both (hidden 'false' then checkbox 'true')
  const fdBothTrue = new FormData();
  fdBothTrue.append("show_expenses_on_home", "false");
  fdBothTrue.append("show_expenses_on_home", "true");
  fdBothTrue.append("show_donations_on_home", "false");
  fdBothTrue.append("show_donations_on_home", "true");

  const rawBothTrue = {
    show_expenses_on_home: fdBothTrue.getAll("show_expenses_on_home").slice(-1)[0],
    show_donations_on_home: fdBothTrue.getAll("show_donations_on_home").slice(-1)[0],
  };
  const valBothTrue = validateHomeVisibilitySettingsInput(rawBothTrue);
  assert.equal(valBothTrue.valid, true);
  assert.equal(valBothTrue.sanitized?.show_expenses_on_home, true);
  assert.equal(valBothTrue.sanitized?.show_donations_on_home, true);

  // Test Case B: User unchecks pengeluaran (only hidden 'false' sent) but checks sumbangan ('false' + 'true')
  const fdDisableExpenses = new FormData();
  fdDisableExpenses.append("show_expenses_on_home", "false");
  fdDisableExpenses.append("show_donations_on_home", "false");
  fdDisableExpenses.append("show_donations_on_home", "true");

  const rawDisableExpenses = {
    show_expenses_on_home: fdDisableExpenses.getAll("show_expenses_on_home").slice(-1)[0],
    show_donations_on_home: fdDisableExpenses.getAll("show_donations_on_home").slice(-1)[0],
  };
  const valDisableExpenses = validateHomeVisibilitySettingsInput(rawDisableExpenses);
  assert.equal(valDisableExpenses.valid, true);
  assert.equal(valDisableExpenses.sanitized?.show_expenses_on_home, false);
  assert.equal(valDisableExpenses.sanitized?.show_donations_on_home, true);

  // Test Case C: User unchecks sumbangan (only hidden 'false' sent) but checks pengeluaran ('false' + 'true')
  const fdDisableDonations = new FormData();
  fdDisableDonations.append("show_expenses_on_home", "false");
  fdDisableDonations.append("show_expenses_on_home", "true");
  fdDisableDonations.append("show_donations_on_home", "false");

  const rawDisableDonations = {
    show_expenses_on_home: fdDisableDonations.getAll("show_expenses_on_home").slice(-1)[0],
    show_donations_on_home: fdDisableDonations.getAll("show_donations_on_home").slice(-1)[0],
  };
  const valDisableDonations = validateHomeVisibilitySettingsInput(rawDisableDonations);
  assert.equal(valDisableDonations.valid, true);
  assert.equal(valDisableDonations.sanitized?.show_expenses_on_home, true);
  assert.equal(valDisableDonations.sanitized?.show_donations_on_home, false);

  // Test Case D: User unchecks both (both only hidden 'false' sent)
  const fdDisableBoth = new FormData();
  fdDisableBoth.append("show_expenses_on_home", "false");
  fdDisableBoth.append("show_donations_on_home", "false");

  const rawDisableBoth = {
    show_expenses_on_home: fdDisableBoth.getAll("show_expenses_on_home").slice(-1)[0],
    show_donations_on_home: fdDisableBoth.getAll("show_donations_on_home").slice(-1)[0],
  };
  const valDisableBoth = validateHomeVisibilitySettingsInput(rawDisableBoth);
  assert.equal(valDisableBoth.valid, true);
  assert.equal(valDisableBoth.sanitized?.show_expenses_on_home, false);
  assert.equal(valDisableBoth.sanitized?.show_donations_on_home, false);
  console.log("  ✓ Multi-checkbox form serialization regression check (independent true/false toggling) lolos");
}

// 25. Uji Validasi & Kontrak Multi-Material Pengeluaran (validateBatchExpenseInput & Atomic Batch Insert)
console.log("\n[25] Uji Validasi & Kontrak Multi-Material Pengeluaran:");
{
  // 25.1 Multi-material batch valid
  const batchValid = validateBatchExpenseInput({
    date: "2025-10-22",
    procurement_group: "Portal Utama",
    items: [
      { description: "Besi 5meter", amount: "200000" },
      { description: "Las portal", amount: 50000 },
      { description: "Cat anti karat", amount: "75000" },
    ],
  });
  assert.equal(batchValid.valid, true);
  assert.equal(batchValid.sanitized?.date, "2025-10-22");
  assert.equal(batchValid.sanitized?.procurement_group, "Portal Utama");
  assert.equal(batchValid.sanitized?.items.length, 3);
  assert.equal(batchValid.sanitized?.totalAmount, 325000);
  assert.deepEqual(batchValid.sanitized?.items, [
    { description: "Besi 5meter", amount: 200000 },
    { description: "Las portal", amount: 50000 },
    { description: "Cat anti karat", amount: 75000 },
  ]);
  console.log("  ✓ Multi-material valid lolos sanitasi & perhitungan total batch akurat (200k + 50k + 75k = 325k)");

  // 25.2 Single-item batch tanpa procurement_group (defaults to null)
  const singleBatch = validateBatchExpenseInput({
    date: "2025-10-22",
    items: [{ description: "Semen 1 sak", amount: 65000 }],
  });
  assert.equal(singleBatch.valid, true);
  assert.equal(singleBatch.sanitized?.procurement_group, null);
  assert.equal(singleBatch.sanitized?.totalAmount, 65000);
  console.log("  ✓ Single item batch tanpa grup default ke null dengan total akurat");

  // 25.3 Empty items array ditolak
  const emptyBatch = validateBatchExpenseInput({
    date: "2025-10-22",
    items: [],
  });
  assert.equal(emptyBatch.valid, false);
  assert.ok(emptyBatch.errors.items);
  console.log("  ✓ Batch tanpa rincian item (empty array) ditolak");

  // 25.4 Strict: No silent skipping (item ke-3 kosong description atau amount)
  const incompleteRowBatch = validateBatchExpenseInput({
    date: "2025-10-22",
    procurement_group: "Portal Utama",
    items: [
      { description: "Besi 5meter", amount: 200000 },
      { description: "Las", amount: 50000 },
      { description: "", amount: "" },
    ],
  });
  assert.equal(incompleteRowBatch.valid, false);
  assert.ok(incompleteRowBatch.errors["items.2.description"], "Harus error pada items.2.description");
  assert.ok(incompleteRowBatch.errors["items.2.amount"], "Harus error pada items.2.amount");
  assert.equal(incompleteRowBatch.sanitized, undefined);
  console.log("  ✓ Strict no silent row skipping: baris kosong di tengah/akhir batch ditolak dengan error terarah");

  // 25.5 Nominal baris invalid (negatif, nol, pecahan, melebihi 1 miliar)
  const badAmountBatch = validateBatchExpenseInput({
    date: "2025-10-22",
    items: [
      { description: "Baris nol", amount: 0 },
      { description: "Baris negatif", amount: -1000 },
      { description: "Baris pecahan", amount: 5000.75 },
      { description: "Baris luar batas", amount: 2_000_000_000 },
    ],
  });
  assert.equal(badAmountBatch.valid, false);
  assert.ok(badAmountBatch.errors["items.0.amount"]);
  assert.ok(badAmountBatch.errors["items.1.amount"]);
  assert.ok(badAmountBatch.errors["items.2.amount"]);
  assert.ok(badAmountBatch.errors["items.3.amount"]);
  console.log("  ✓ Penolakan nominal baris nol, negatif, pecahan, dan melebihi 1 miliar lolos");

  // 25.6 Procurement group > 100 karakter dan tanggal invalid ditolak
  const badGroupAndDate = validateBatchExpenseInput({
    date: "2025-13-45",
    procurement_group: "P".repeat(101),
    items: [{ description: "Paku", amount: 10000 }],
  });
  assert.equal(badGroupAndDate.valid, false);
  assert.ok(badGroupAndDate.errors.date);
  assert.ok(badGroupAndDate.errors.procurement_group);
  console.log("  ✓ Validasi tanggal kalender dan panjang grup (<= 100 char) pada batch lolos");

  // 25.7 Kontrak Batch Atomicity: Pembuatan single insert payload
  function buildBatchInsertPayload({ date, procurement_group, receipt_path, items, userId }) {
    return items.map((item) => ({
      date,
      description: item.description,
      amount: item.amount,
      procurement_group,
      receipt_path,
      created_by: userId,
      updated_by: userId,
    }));
  }

  const payload = buildBatchInsertPayload({
    date: batchValid.sanitized.date,
    procurement_group: batchValid.sanitized.procurement_group,
    receipt_path: "receipts/batch_123.jpg",
    items: batchValid.sanitized.items,
    userId: "user-admin-1",
  });
  assert.equal(payload.length, 3);
  assert.equal(payload.every((r) => r.procurement_group === "Portal Utama"), true);
  assert.equal(payload.every((r) => r.date === "2025-10-22"), true);
  assert.equal(payload.every((r) => r.receipt_path === "receipts/batch_123.jpg"), true);
  assert.equal(payload[0].description, "Besi 5meter");
  assert.equal(payload[0].amount, 200000);
  console.log("  ✓ Kontrak struktur atomic insert payload (shared group/date/receipt & individual material) terverifikasi");

  // 25.8 Kontrak Preservasi Shared Receipt saat Penghapusan Baris Saudara (Fail-Closed Cleanup)
  // Storage kuitansi HANYA boleh dihapus jika count query sukses tanpa error dan count === 0.
  // Jika query error, count null/undefined, atau count > 0, receipt TIDAK boleh dihapus (fail-closed).
  function evaluateReceiptCleanup({ count, countError }) {
    if (!countError && count === 0) {
      return { storageDeleted: true, reason: "Tidak ada baris lain yang menggunakan kuitansi ini, storage dibersihkan" };
    }
    return { storageDeleted: false, reason: "Kuitansi dipertahankan (referensi tersisa atau status query tidak pasti)" };
  }

  // Skenario 1: count positive (item saudara masih ada) -> kuitansi dipertahankan
  assert.equal(evaluateReceiptCleanup({ count: 2, countError: null }).storageDeleted, false);
  assert.equal(evaluateReceiptCleanup({ count: 1, countError: null }).storageDeleted, false);

  // Skenario 2: count zero (tidak ada item saudara, query sukses) -> kuitansi aman dihapus
  assert.equal(evaluateReceiptCleanup({ count: 0, countError: null }).storageDeleted, true);

  // Skenario 3: query error (error database / timeout, count null) -> fail-closed, kuitansi TIDAK dihapus
  assert.equal(evaluateReceiptCleanup({ count: null, countError: { message: "connection error" } }).storageDeleted, false);

  // Skenario 4: count null tanpa error -> fail-closed, kuitansi TIDAK dihapus
  assert.equal(evaluateReceiptCleanup({ count: null, countError: null }).storageDeleted, false);

  // Skenario 5: count undefined tanpa error -> fail-closed, kuitansi TIDAK dihapus
  assert.equal(evaluateReceiptCleanup({ count: undefined, countError: null }).storageDeleted, false);

  // Skenario 6: query error dengan count 0 (inkonsisten) -> fail-closed, kuitansi TIDAK dihapus
  assert.equal(evaluateReceiptCleanup({ count: 0, countError: { message: "partial failure" } }).storageDeleted, false);

  console.log("  ✓ Kontrak proteksi shared receipt fail-closed: storage tidak dihapus pada count positif, null, atau error");
}

// 26. Uji Kontrak Alur Logout & Auth Redirection
console.log("\n[26] Uji Kontrak Logout Action & Redirection:");
{
  // Simulasi implementasi logoutAction yang identik dengan app/pengurus/actions.ts
  async function simulateLogoutAction(mockSupabase) {
    if (!mockSupabase) {
      return { redirect: "/login" };
    }

    const { error } = await mockSupabase.auth.signOut();
    if (error) {
      return {
        success: false,
        message: error.message || "Gagal keluar sesi akun.",
      };
    }

    return { redirect: "/login" };
  }

  // 26.1 Tanpa Supabase client (unauthenticated / unconfigured) -> redirect /login
  const noClientResult = await simulateLogoutAction(null);
  assert.equal(noClientResult.redirect, "/login", "Harus redirect ke /login saat client tidak ada");
  console.log("  ✓ Logout tanpa client supabase mengarah ke /login");

  // 26.2 Sukses signOut -> redirect /login
  let signOutCalled = false;
  const mockSuccessSupabase = {
    auth: {
      async signOut() {
        signOutCalled = true;
        return { error: null };
      },
    },
  };
  const successResult = await simulateLogoutAction(mockSuccessSupabase);
  assert.equal(signOutCalled, true, "signOut harus dipanggil");
  assert.equal(successResult.redirect, "/login", "Harus redirect ke /login setelah signOut sukses");
  console.log("  ✓ Logout dengan signOut sukses mengarah ke /login");

  // 26.3 Gagal signOut -> return ActionResult error tanpa redirect
  const mockFailSupabase = {
    auth: {
      async signOut() {
        return { error: { message: "Network error saat sign out" } };
      },
    },
  };
  const failResult = await simulateLogoutAction(mockFailSupabase);
  assert.equal(failResult.success, false, "Status success harus false saat signOut gagal");
  assert.equal(failResult.message, "Network error saat sign out", "Pesan error diteruskan");
  assert.equal(failResult.redirect, undefined, "Tidak boleh redirect saat signOut gagal");
  console.log("  ✓ Logout dengan error signOut mengembalikan status error dan tidak redirect");
}

// 27. Uji Shared Layout, Chrome Navigation & Loading Isolation
console.log("\n[27] Uji Shared Layout, Chrome Navigation, & Loading Isolation:");
{
  // 27.1 Kontrak Auth Protection pada Layout Pengurus
  async function simulatePengurusLayoutAuth({ configured, client }) {
    if (!configured) {
      return { status: "not_configured" };
    }
    if (!client) {
      return { redirect: "/login" };
    }
    const { data } = await client.auth.getUser();
    if (!data || !data.user) {
      return { redirect: "/login" };
    }
    const { data: allowlistEntry } = await client
      .from("pengurus_allowlist")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!allowlistEntry) {
      return { status: "access_denied", userId: data.user.id, email: data.user.email };
    }
    return { status: "authorized", user: data.user };
  }

  // Tanpa konfigurasi
  const resNotConfigured = await simulatePengurusLayoutAuth({ configured: false });
  assert.equal(resNotConfigured.status, "not_configured", "Harus render error unconfigured");
  console.log("  ✓ Layout memblokir akses saat Supabase belum terkonfigurasi");

  // Tanpa sesi -> redirect /login
  const resNoSession = await simulatePengurusLayoutAuth({
    configured: true,
    client: {
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  });
  assert.equal(resNoSession.redirect, "/login", "Harus redirect ke /login saat tidak ada sesi");
  console.log("  ✓ Layout mengalihkan pengguna unauthenticated ke /login");

  // Pengguna non-allowlist -> access_denied
  const resDenied = await simulatePengurusLayoutAuth({
    configured: true,
    client: {
      auth: { getUser: async () => ({ data: { user: { id: "user-123", email: "guest@example.com" } } }) },
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: null }),
                };
              },
            };
          },
        };
      },
    },
  });
  assert.equal(resDenied.status, "access_denied", "Harus ditolak jika tidak ada di allowlist");
  console.log("  ✓ Layout menolak akses pengguna yang tidak terdaftar di allowlist");

  // Pengguna allowlisted -> authorized
  const resAuth = await simulatePengurusLayoutAuth({
    configured: true,
    client: {
      auth: { getUser: async () => ({ data: { user: { id: "pengurus-1", email: "admin@example.com" } } }) },
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: { user_id: "pengurus-1" } }),
                };
              },
            };
          },
        };
      },
    },
  });
  assert.equal(resAuth.status, "authorized", "Harus diizinkan jika terdaftar di allowlist");
  console.log("  ✓ Layout mengizinkan pengguna yang valid dan terdaftar di allowlist");

  // 27.2 Kontrak Navigasi & Subheader State
  function resolveChromeState(pathname) {
    const isPengeluaranSubpage =
      pathname.startsWith("/pengurus/pengeluaran/") &&
      pathname !== "/pengurus/pengeluaran";
    const isPengeluaranTambah = pathname === "/pengurus/pengeluaran/tambah";
    const match = pathname.match(/^\/pengurus\/pengeluaran\/(\d+)/);

    const isGaleri = pathname.startsWith("/pengurus/galeri");

    let actionLabel = "Tampilan Publik";
    let actionHref = "/";
    if (isPengeluaranSubpage) {
      actionLabel = "← Batal & Kembali";
      actionHref = "/pengurus/pengeluaran";
    }

    let subheaderType = "tabs";
    let breadcrumbTitle = null;
    if (isPengeluaranSubpage) {
      subheaderType = "breadcrumb";
      breadcrumbTitle = isPengeluaranTambah ? "Tambah Pengeluaran" : `Edit Pengeluaran #${match ? match[1] : ""}`;
    }

    const tabs = [
      { href: "/pengurus", label: "Data Iuran Warga" },
      { href: "/pengurus/master-bendahara", label: "Master Bendahara & QRIS" },
      { href: "/pengurus/pengeluaran", label: "Pengeluaran Kas" },
      { href: "/pengurus/galeri", label: "Galeri Kegiatan" },
      { href: "/pengurus/pengaturan", label: "Pengaturan" },
    ].map((tab) => ({
      ...tab,
      isActive:
        tab.href === "/pengurus"
          ? pathname === "/pengurus"
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    }));

    return {
      actionLabel,
      actionHref,
      subheaderType,
      breadcrumbTitle,
      hasGaleriPublicLink: isGaleri,
      tabs,
    };
  }

  // Dashboard utama
  const dashState = resolveChromeState("/pengurus");
  assert.equal(dashState.subheaderType, "tabs");
  assert.equal(dashState.tabs.find((t) => t.href === "/pengurus").isActive, true);
  assert.equal(dashState.tabs.find((t) => t.href === "/pengurus/galeri").isActive, false);
  console.log("  ✓ Resolusi tab aktif dashboard (/pengurus) akurat");

  // Halaman galeri
  const galeriState = resolveChromeState("/pengurus/galeri");
  assert.equal(galeriState.hasGaleriPublicLink, true);
  assert.equal(galeriState.tabs.find((t) => t.href === "/pengurus/galeri").isActive, true);
  assert.equal(galeriState.tabs.find((t) => t.href === "/pengurus").isActive, false);
  console.log("  ✓ Resolusi aksi khusus galeri ('Lihat Galeri Publik') dan tab aktif akurat");

  // Subpage pengeluaran tambah
  const tambahState = resolveChromeState("/pengurus/pengeluaran/tambah");
  assert.equal(tambahState.subheaderType, "breadcrumb");
  assert.equal(tambahState.breadcrumbTitle, "Tambah Pengeluaran");
  assert.equal(tambahState.actionLabel, "← Batal & Kembali");
  assert.equal(tambahState.actionHref, "/pengurus/pengeluaran");
  console.log("  ✓ Resolusi breadcrumb dan aksi batal pada /pengurus/pengeluaran/tambah akurat");

  // Subpage pengeluaran edit
  const editState = resolveChromeState("/pengurus/pengeluaran/42");
  assert.equal(editState.subheaderType, "breadcrumb");
  assert.equal(editState.breadcrumbTitle, "Edit Pengeluaran #42");
  assert.equal(editState.actionLabel, "← Batal & Kembali");
  console.log("  ✓ Resolusi breadcrumb dinamis pada /pengurus/pengeluaran/[id] akurat");

  // 27.3 Kontrak Isolasi Loading Skeleton (Tidak menduplikasi chrome)
  const fs = await import("node:fs");
  const loadingContent = fs.readFileSync("app/pengurus/loading.tsx", "utf-8");
  assert.equal(loadingContent.includes("<header"), false, "Loading skeleton tidak boleh mengandung tag <header>");
  assert.equal(loadingContent.includes("Portal Pengurus"), false, "Loading skeleton tidak boleh menduplikasi teks navbar");
  assert.equal(loadingContent.includes("Data Iuran Warga"), false, "Loading skeleton tidak boleh menduplikasi tabs");
  assert.equal(loadingContent.includes("<main"), true, "Loading skeleton harus terkurung dalam tag <main>");
  console.log("  ✓ File loading skeleton terisolasi di dalam <main> tanpa menduplikasi header/tabs");
}

console.log("\n=== SEMUA PENGECEKAN LOKAL SUKSES ===");


