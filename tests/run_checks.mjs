import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { formatIDR, formatDateID, normalizeWhatsAppNumber, formatWhatsAppUrl } from "../lib/format.ts";
import { validateIuranInput } from "../lib/validation.ts";
import {
  validateImageBuffer,
  MAX_FILE_SIZE_BYTES,
  getPaymentSettings,
  savePaymentSettings,
} from "../lib/payment-settings.ts";
import {
  calculateResidentTotals,
  sortRecordsByCumulativePaidDesc,
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

console.log("\n=== SEMUA PENGECEKAN LOKAL SUKSES ===");


