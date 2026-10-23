"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateIuranInput, validateBendaharaInput, validateTreasurerInput, validateExpenseInput, validateBatchExpenseInput, validateGalleryInput, validateHomeExpensesSettingInput, validateHomeVisibilitySettingsInput } from "@/lib/validation";
import {
  validateImageBuffer,
  MAX_FILE_SIZE_BYTES,
  MAX_GALLERY_FILE_SIZE_BYTES,
  savePaymentSettings,
} from "@/lib/payment-settings";
import { GALLERY_STORAGE_BUCKET } from "@/lib/gallery";


export type ActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

// ponytail: Direct server action validating inputs and writing through RLS-enforced client. Upgrade to queue or audit log table if enterprise audit compliance required.
export async function createIuranRecord(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const raw = {
    nama_blok: formData.get("nama_blok"),
    nomor_blok: formData.get("nomor_blok"),
    nama_kepala_keluarga: formData.get("nama_kepala_keluarga"),
    amount: formData.get("amount"),
  };

  const validation = validateIuranInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data yang dimasukkan tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  // Periksa otentikasi pengguna
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  // Insert ke tabel iuran
  // PostgreSQL RLS menjamin:
  // 1) created_by = auth.uid()
  // 2) user_id terdaftar di pengurus_allowlist
  const { error: insertError } = await supabase.from("iuran").insert({
    nama_blok: validation.sanitized.nama_blok,
    nomor_blok: validation.sanitized.nomor_blok,
    nama_kepala_keluarga: validation.sanitized.nama_kepala_keluarga,
    amount: validation.sanitized.amount,
    created_by: user.id,
  });

  if (insertError) {
    if (insertError.code === "42501" || insertError.message.includes("policy")) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin pengurus (RLS Policy Enforcement).",
      };
    }

    return {
      success: false,
      message: "Gagal menyimpan data iuran: " + insertError.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");

  return {
    success: true,
    message: `Iuran untuk ${validation.sanitized.nama_blok} No. ${validation.sanitized.nomor_blok} (${validation.sanitized.nama_kepala_keluarga}) berhasil dicatat.`,
  };
}

export async function updateIuranRecord(
  id: number,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const safeId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(safeId) || safeId <= 0) {
    return {
      success: false,
      message: "ID iuran tidak valid.",
    };
  }

  const raw = {
    nama_blok: formData.get("nama_blok"),
    nomor_blok: formData.get("nomor_blok"),
    nama_kepala_keluarga: formData.get("nama_kepala_keluarga"),
    amount: formData.get("amount"),
  };

  const validation = validateIuranInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data yang dimasukkan tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: updatedRecord, error: updateError } = await supabase
    .from("iuran")
    .update({
      nama_blok: validation.sanitized.nama_blok,
      nomor_blok: validation.sanitized.nomor_blok,
      nama_kepala_keluarga: validation.sanitized.nama_kepala_keluarga,
      amount: validation.sanitized.amount,
    })
    .eq("id", safeId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "42501" || updateError.message.includes("policy")) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk mengubah data (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal memperbarui data iuran: " + updateError.message,
    };
  }

  if (!updatedRecord) {
    return {
      success: false,
      message:
        "Data iuran tidak ditemukan atau akun Anda tidak memiliki izin memperbarui data ini.",
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");

  return {
    success: true,
    message: `Iuran untuk ${validation.sanitized.nama_blok} No. ${validation.sanitized.nomor_blok} (${validation.sanitized.nama_kepala_keluarga}) berhasil diperbarui.`,
  };
}

export async function deleteIuranRecord(id: number): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const safeId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(safeId) || safeId <= 0) {
    return {
      success: false,
      message: "ID iuran tidak valid.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: deletedRecord, error: deleteError } = await supabase
    .from("iuran")
    .delete()
    .eq("id", safeId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    if (deleteError.code === "42501" || deleteError.message.includes("policy")) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk menghapus data (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal menghapus data iuran: " + deleteError.message,
    };
  }

  if (!deletedRecord) {
    return {
      success: false,
      message:
        "Data iuran tidak ditemukan atau akun Anda tidak memiliki izin menghapus data ini.",
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");

  return {
    success: true,
    message: "Data iuran berhasil dihapus.",
  };
}

export async function uploadQrisAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  // Cek apakah user ada dalam daftar pengurus_allowlist
  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengunggah QRIS.",
    };
  }

  const file = formData.get("qris_image");
  if (!file || !(file instanceof File)) {
    return {
      success: false,
      message: "Pilih berkas gambar QRIS terlebih dahulu.",
    };
  }

  if (file.size === 0) {
    return {
      success: false,
      message: "Berkas yang dipilih kosong.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      message: "Ukuran berkas melebihi batas maksimal 2MB.",
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = validateImageBuffer(buffer);
  if (!validation.valid || !validation.extension || !validation.mimeType) {
    return {
      success: false,
      message: validation.error || "Berkas tidak valid.",
    };
  }

  const uniqueId = randomUUID().replace(/-/g, "").slice(0, 12);
  const storagePath = `qris/qris_${Date.now()}_${uniqueId}.${validation.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-assets")
    .upload(storagePath, buffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (uploadError) {
    if (
      uploadError.message.includes("policy") ||
      (uploadError as { statusCode?: string }).statusCode === "403"
    ) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk mengunggah berkas QRIS (Storage Policy).",
      };
    }
    return {
      success: false,
      message:
        "Gagal mengunggah berkas QRIS ke penyimpanan: " + uploadError.message,
    };
  }

  const { data: urlData } = supabase.storage
    .from("payment-assets")
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const saveResult = await savePaymentSettings(
    { qris_image_url: publicUrl },
    supabase,
    user.id
  );

  if (!saveResult.success) {
    try {
      await supabase.storage.from("payment-assets").remove([storagePath]);
    } catch {
      // Abaikan kegagalan cleanup
    }

    if (
      saveResult.error?.includes("policy") ||
      saveResult.error?.includes("42501")
    ) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengaturan pembayaran (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal memperbarui data QRIS di database: " + saveResult.error,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/master-bendahara");

  return {
    success: true,
    message: "Gambar QRIS berhasil diperbarui.",
  };
}

export async function updateBendaharaAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  // Cek apakah user ada dalam daftar pengurus_allowlist
  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message:
        "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengubah data master bendahara.",
    };
  }

  const raw = {
    nama_bendahara: formData.get("nama_bendahara"),
    no_wa_bendahara: formData.get("no_wa_bendahara"),
  };

  const validation = validateBendaharaInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data bendahara tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  const saveResult = await savePaymentSettings(
    {
      nama_bendahara: validation.sanitized.nama_bendahara,
      no_wa_bendahara: validation.sanitized.no_wa_bendahara,
    },
    supabase,
    user.id
  );

  if (!saveResult.success) {
    if (
      saveResult.error?.includes("policy") ||
      saveResult.error?.includes("42501")
    ) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengaturan pembayaran (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal memperbarui data bendahara: " + saveResult.error,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/master-bendahara");

  return {
    success: true,
    message: "Data master bendahara berhasil disimpan.",
  };
}

// ponytail: Update home expenses visibility toggle in payment_settings with allowlist check & revalidation.
export async function updateHomeExpensesVisibilityAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message:
        "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengubah pengaturan sistem.",
    };
  }

  const expensesValues = formData.getAll("show_expenses_on_home");
  const raw = {
    show_expenses_on_home: expensesValues.length > 0 ? expensesValues[expensesValues.length - 1] : undefined,
  };

  const validation = validateHomeExpensesSettingInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Pengaturan visibilitas pengeluaran tidak valid.",
      errors: validation.errors,
    };
  }

  const saveResult = await savePaymentSettings(
    {
      show_expenses_on_home: validation.sanitized.show_expenses_on_home,
    },
    supabase,
    user.id
  );

  if (!saveResult.success) {
    if (
      saveResult.error?.includes("policy") ||
      saveResult.error?.includes("42501")
    ) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengaturan (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal memperbarui pengaturan visibilitas: " + saveResult.error,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/pengaturan");

  return {
    success: true,
    message: validation.sanitized.show_expenses_on_home
      ? "Pengeluaran kini ditampilkan di beranda."
      : "Pengeluaran kini disembunyikan dari beranda.",
  };
}

// ponytail: Update home visibility settings (expenses & donations) in payment_settings with allowlist check & revalidation.
export async function updateHomeVisibilitySettingsAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message:
        "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengubah pengaturan sistem.",
    };
  }

  const raw: { show_expenses_on_home?: unknown; show_donations_on_home?: unknown } = {};
  if (formData.has("show_expenses_on_home")) {
    const values = formData.getAll("show_expenses_on_home");
    raw.show_expenses_on_home = values[values.length - 1];
  }
  if (formData.has("show_donations_on_home")) {
    const values = formData.getAll("show_donations_on_home");
    raw.show_donations_on_home = values[values.length - 1];
  }

  const validation = validateHomeVisibilitySettingsInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Pengaturan visibilitas tidak valid.",
      errors: validation.errors,
    };
  }

  const saveResult = await savePaymentSettings(
    validation.sanitized,
    supabase,
    user.id
  );

  if (!saveResult.success) {
    if (
      saveResult.error?.includes("policy") ||
      saveResult.error?.includes("42501")
    ) {
      return {
        success: false,
        message:
          "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengaturan (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal memperbarui pengaturan visibilitas: " + saveResult.error,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/pengaturan");

  return {
    success: true,
    message: "Pengaturan tampilan beranda berhasil disimpan.",
  };
}

// ponytail: Create a new treasurer record. Allows multiple active treasurers with isolated QRIS uploads.
export async function createTreasurerAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak menambah bendahara.",
    };
  }

  const raw = {
    name: formData.get("name"),
    wa_number: formData.get("wa_number"),
    is_active: formData.get("is_active") === "true" || formData.get("is_active") === "on",
  };

  const validation = validateTreasurerInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data bendahara tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  // Handle optional QRIS image upload for this treasurer
  let qrisImageUrl: string | null = null;
  const qrisFile = formData.get("qris_image");
  if (qrisFile && qrisFile instanceof File && qrisFile.size > 0) {
    if (qrisFile.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: "Ukuran berkas QRIS melebihi batas maksimal 2MB.",
      };
    }

    const arrayBuffer = await qrisFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imgValidation = validateImageBuffer(buffer);
    if (!imgValidation.valid || !imgValidation.extension || !imgValidation.mimeType) {
      return {
        success: false,
        message: imgValidation.error || "Berkas QRIS tidak valid.",
      };
    }

    const uniqueId = randomUUID().replace(/-/g, "").slice(0, 12);
    const storagePath = `treasurers/qris_${Date.now()}_${uniqueId}.${imgValidation.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-assets")
      .upload(storagePath, buffer, {
        contentType: imgValidation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        message: "Gagal mengunggah berkas QRIS bendahara: " + uploadError.message,
      };
    }

    const { data: urlData } = supabase.storage
      .from("payment-assets")
      .getPublicUrl(storagePath);

    qrisImageUrl = urlData.publicUrl;
  }

  const { error: insertError } = await supabase.from("treasurers").insert({
    name: validation.sanitized.name,
    wa_number: validation.sanitized.wa_number,
    is_active: validation.sanitized.is_active,
    qris_image_url: qrisImageUrl,
    created_by: user.id,
    updated_by: user.id,
  });

  if (insertError) {
    if (insertError.code === "42501" || insertError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk menambah data bendahara (RLS Policy).",
      };
    }
    return {
      success: false,
      message: "Gagal menambahkan bendahara baru: " + insertError.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/master-bendahara");

  return {
    success: true,
    message: `Bendahara ${validation.sanitized.name} berhasil ditambahkan.`,
  };
}

// ponytail: Update treasurer record. Allows changing name, WA, active status, and optional QRIS replacement.
export async function updateTreasurerAction(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  if (!id || typeof id !== "string") {
    return {
      success: false,
      message: "ID bendahara tidak valid.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengubah data bendahara.",
    };
  }

  const raw = {
    name: formData.get("name"),
    wa_number: formData.get("wa_number"),
    is_active: formData.get("is_active") === "true" || formData.get("is_active") === "on",
  };

  const validation = validateTreasurerInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data bendahara tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  const updatePayload: Record<string, unknown> = {
    name: validation.sanitized.name,
    wa_number: validation.sanitized.wa_number,
    is_active: validation.sanitized.is_active,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  // Check if new QRIS image uploaded
  const qrisFile = formData.get("qris_image");
  if (qrisFile && qrisFile instanceof File && qrisFile.size > 0) {
    if (qrisFile.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: "Ukuran berkas QRIS melebihi batas maksimal 2MB.",
      };
    }

    const arrayBuffer = await qrisFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imgValidation = validateImageBuffer(buffer);
    if (!imgValidation.valid || !imgValidation.extension || !imgValidation.mimeType) {
      return {
        success: false,
        message: imgValidation.error || "Berkas QRIS tidak valid.",
      };
    }

    const uniqueId = randomUUID().replace(/-/g, "").slice(0, 12);
    const storagePath = `treasurers/qris_${Date.now()}_${uniqueId}.${imgValidation.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-assets")
      .upload(storagePath, buffer, {
        contentType: imgValidation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        message: "Gagal mengunggah berkas QRIS: " + uploadError.message,
      };
    }

    const { data: urlData } = supabase.storage
      .from("payment-assets")
      .getPublicUrl(storagePath);

    updatePayload.qris_image_url = urlData.publicUrl;
  }

  const { data: updatedRecord, error: updateError } = await supabase
    .from("treasurers")
    .update(updatePayload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "42501" || updateError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui data bendahara (RLS Policy).",
      };
    }
    return {
      success: false,
      message: "Gagal memperbarui data bendahara: " + updateError.message,
    };
  }

  if (!updatedRecord) {
    return {
      success: false,
      message: "Data bendahara tidak ditemukan.",
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/master-bendahara");
  revalidatePath(`/pengurus/master-bendahara/${id}`);

  return {
    success: true,
    message: `Data bendahara ${validation.sanitized.name} berhasil diperbarui.`,
  };
}

// ponytail: Create a new expense record with optional private receipt upload.
export async function createExpenseAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak mencatat pengeluaran.",
    };
  }

  const rawGroup = formData.get("procurement_group");
  const rawDate = formData.get("date");

  // Read dynamic multi-material rows if submitted
  const itemDescriptions = formData.getAll("item_description");
  const itemAmounts = formData.getAll("item_amount");

  let items: Array<{ description: unknown; amount: unknown }> = [];

  if (itemDescriptions.length > 0 || itemAmounts.length > 0) {
    const maxLen = Math.max(itemDescriptions.length, itemAmounts.length);
    for (let i = 0; i < maxLen; i++) {
      items.push({
        description: itemDescriptions[i],
        amount: itemAmounts[i],
      });
    }
  } else {
    // Fallback for single item (legacy / direct API callers)
    items = [
      {
        description: formData.get("description"),
        amount: formData.get("amount"),
      },
    ];
  }

  const validation = validateBatchExpenseInput({
    date: rawDate,
    procurement_group: rawGroup,
    items,
  });

  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data pengeluaran tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  const sanitized = validation.sanitized;

  let receiptStoragePath: string | null = null;
  const receiptFile = formData.get("receipt");

  if (receiptFile && receiptFile instanceof File && receiptFile.size > 0) {
    if (receiptFile.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: "Ukuran berkas kuitansi melebihi batas maksimal 2MB.",
      };
    }

    const arrayBuffer = await receiptFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imgValidation = validateImageBuffer(buffer);
    if (!imgValidation.valid || !imgValidation.extension || !imgValidation.mimeType) {
      return {
        success: false,
        message: imgValidation.error || "Berkas kuitansi tidak valid (harus PNG, JPG, atau WEBP).",
      };
    }

    const uniqueId = randomUUID().replace(/-/g, "").slice(0, 12);
    receiptStoragePath = `receipts/${Date.now()}_${uniqueId}.${imgValidation.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("expense-receipts")
      .upload(receiptStoragePath, buffer, {
        contentType: imgValidation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        message: "Gagal mengunggah berkas kuitansi: " + uploadError.message,
      };
    }
  }

  const recordsToInsert = sanitized.items.map((item) => ({
    date: sanitized.date,
    description: item.description,
    amount: item.amount,
    procurement_group: sanitized.procurement_group,
    receipt_path: receiptStoragePath,
    created_by: user.id,
    updated_by: user.id,
  }));

  const { error: insertError } = await supabase
    .from("expenses")
    .insert(recordsToInsert);

  if (insertError) {
    // Rollback uploaded storage receipt on DB insert failure
    if (receiptStoragePath) {
      try {
        await supabase.storage.from("expense-receipts").remove([receiptStoragePath]);
      } catch {
        // Ignore cleanup error
      }
    }

    if (insertError.code === "42501" || insertError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk menambah data pengeluaran (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal mencatat pengeluaran: " + insertError.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/pengeluaran");

  const itemCount = sanitized.items.length;
  const groupLabel = sanitized.procurement_group
    ? `kelompok "${sanitized.procurement_group}" `
    : "";

  return {
    success: true,
    message:
      itemCount === 1
        ? `Pengeluaran ${groupLabel}sebesar Rp ${sanitized.totalAmount.toLocaleString("id-ID")} berhasil dicatat.`
        : `Berhasil mencatat ${itemCount} item pengeluaran ${groupLabel}dengan total Rp ${sanitized.totalAmount.toLocaleString("id-ID")}.`,
  };
}

// ponytail: Update existing expense record with optional receipt replacement or deletion.
export async function updateExpenseAction(
  id: number,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const safeId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(safeId) || safeId <= 0) {
    return {
      success: false,
      message: "ID pengeluaran tidak valid.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak memperbarui pengeluaran.",
    };
  }

  const raw = {
    date: formData.get("date"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    procurement_group: formData.get("procurement_group"),
  };

  const validation = validateExpenseInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data pengeluaran tidak valid. Periksa isian formulir.",
      errors: validation.errors,
    };
  }

  // Fetch current record to get existing receipt_path
  const { data: currentExpense } = await supabase
    .from("expenses")
    .select("id, receipt_path")
    .eq("id", safeId)
    .maybeSingle();

  if (!currentExpense) {
    return {
      success: false,
      message: "Data pengeluaran tidak ditemukan.",
    };
  }

  const removeReceipt = formData.get("remove_receipt") === "true" || formData.get("remove_receipt") === "1";
  let finalReceiptPath: string | null = currentExpense.receipt_path;
  const oldReceiptToDelete: string | null = (removeReceipt || formData.get("receipt")) ? currentExpense.receipt_path : null;

  if (removeReceipt) {
    finalReceiptPath = null;
  }

  const newReceiptFile = formData.get("receipt");
  if (newReceiptFile && newReceiptFile instanceof File && newReceiptFile.size > 0) {
    if (newReceiptFile.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: "Ukuran berkas kuitansi melebihi batas maksimal 2MB.",
      };
    }

    const arrayBuffer = await newReceiptFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imgValidation = validateImageBuffer(buffer);
    if (!imgValidation.valid || !imgValidation.extension || !imgValidation.mimeType) {
      return {
        success: false,
        message: imgValidation.error || "Berkas kuitansi tidak valid (harus PNG, JPG, atau WEBP).",
      };
    }

    const uniqueId = randomUUID().replace(/-/g, "").slice(0, 12);
    const newStoragePath = `receipts/${Date.now()}_${uniqueId}.${imgValidation.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("expense-receipts")
      .upload(newStoragePath, buffer, {
        contentType: imgValidation.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        message: "Gagal mengunggah berkas kuitansi pengganti: " + uploadError.message,
      };
    }

    finalReceiptPath = newStoragePath;
  }

  const { data: updatedRecord, error: updateError } = await supabase
    .from("expenses")
    .update({
      date: validation.sanitized.date,
      description: validation.sanitized.description,
      amount: validation.sanitized.amount,
      procurement_group: validation.sanitized.procurement_group,
      receipt_path: finalReceiptPath,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", safeId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    // Cleanup newly uploaded file if DB update failed
    if (finalReceiptPath && finalReceiptPath !== currentExpense.receipt_path) {
      try {
        await supabase.storage.from("expense-receipts").remove([finalReceiptPath]);
      } catch {
        // Ignore
      }
    }

    if (updateError.code === "42501" || updateError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk memperbarui pengeluaran (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal memperbarui data pengeluaran: " + updateError.message,
    };
  }

  if (!updatedRecord) {
    return {
      success: false,
      message: "Data pengeluaran tidak ditemukan.",
    };
  }

  // Cleanup old receipt file from storage if it was removed or replaced AND no other record shares it
  if (oldReceiptToDelete && oldReceiptToDelete !== finalReceiptPath) {
    try {
      const { count, error: countError } = await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("receipt_path", oldReceiptToDelete);

      if (!countError && count === 0) {
        await supabase.storage.from("expense-receipts").remove([oldReceiptToDelete]);
      }
    } catch {
      // Ignore cleanup error
    }
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/pengeluaran");
  revalidatePath(`/pengurus/pengeluaran/${safeId}`);

  return {
    success: true,
    message: `Data pengeluaran berhasil diperbarui.`,
  };
}

// ponytail: Delete an expense record and remove its receipt from storage.
export async function deleteExpenseAction(id: number): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const safeId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(safeId) || safeId <= 0) {
    return {
      success: false,
      message: "ID pengeluaran tidak valid.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak menghapus data.",
    };
  }

  // Fetch receipt_path first to clean up storage after deletion
  const { data: record } = await supabase
    .from("expenses")
    .select("id, receipt_path")
    .eq("id", safeId)
    .maybeSingle();

  const { data: deletedRecord, error: deleteError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", safeId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    if (deleteError.code === "42501" || deleteError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk menghapus data (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal menghapus data pengeluaran: " + deleteError.message,
    };
  }

  if (!deletedRecord) {
    return {
      success: false,
      message: "Data pengeluaran tidak ditemukan atau sudah dihapus sebelumnya.",
    };
  }

  // Clean up receipt image from storage if present AND no other record shares it
  if (record?.receipt_path) {
    try {
      const { count, error: countError } = await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("receipt_path", record.receipt_path);

      if (!countError && count === 0) {
        await supabase.storage.from("expense-receipts").remove([record.receipt_path]);
      }
    } catch {
      // Ignore storage cleanup error
    }
  }

  revalidatePath("/");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/pengeluaran");

  return {
    success: true,
    message: "Data pengeluaran berhasil dihapus.",
  };
}

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login");
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return {
      success: false,
      message: error.message || "Gagal keluar sesi akun.",
    };
  }

  redirect("/login");
}

// ponytail: Upload and store gallery documentation photos for kerja bakti and its results. Enforces allowlist, magic bytes, and max 5MB.
export async function uploadGalleryPhotoAction(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const raw = {
    title: formData.get("title"),
    category: formData.get("category"),
    caption: formData.get("caption"),
  };

  const validation = validateGalleryInput(raw);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      message: "Data formulir foto galeri tidak valid.",
      errors: validation.errors,
    };
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      success: false,
      message: "Pilih berkas foto yang akan diunggah.",
      errors: { image: "Berkas foto wajib dipilih." },
    };
  }

  if (file.size > MAX_GALLERY_FILE_SIZE_BYTES) {
    return {
      success: false,
      message: "Ukuran foto melebihi batas maksimal 5MB.",
      errors: { image: "Ukuran foto maksimal 5MB." },
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const imgValidation = validateImageBuffer(buffer, MAX_GALLERY_FILE_SIZE_BYTES);

  if (!imgValidation.valid || !imgValidation.extension || !imgValidation.mimeType) {
    return {
      success: false,
      message: imgValidation.error || "Berkas foto tidak valid.",
      errors: { image: imgValidation.error || "Format gambar tidak didukung." },
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak mengunggah dokumentasi.",
    };
  }

  const uniqueId = randomUUID().slice(0, 8);
  const storagePath = `photos/${validation.sanitized.category}_${Date.now()}_${uniqueId}.${imgValidation.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: imgValidation.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    if (
      uploadError.message.includes("policy") ||
      (uploadError as { statusCode?: string }).statusCode === "403"
    ) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk mengunggah ke galeri (Storage Policy).",
      };
    }
    return {
      success: false,
      message: "Gagal mengunggah foto ke penyimpanan: " + uploadError.message,
    };
  }

  const { data: urlData } = supabase.storage
    .from(GALLERY_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const { error: insertError } = await supabase
    .from("gallery_items")
    .insert({
      title: validation.sanitized.title,
      category: validation.sanitized.category,
      caption: validation.sanitized.caption,
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      created_by: user.id,
    });

  if (insertError) {
    // Rollback uploaded storage file on DB insert failure
    try {
      await supabase.storage.from(GALLERY_STORAGE_BUCKET).remove([storagePath]);
    } catch {
      // Ignore cleanup error
    }

    if (insertError.code === "42501" || insertError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk menyimpan data foto (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal menyimpan data foto ke database: " + insertError.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/pengurus/galeri");
  revalidatePath("/admin/galeri");

  return {
    success: true,
    message: "Foto dokumentasi kerja bakti berhasil diunggah.",
  };
}

// ponytail: Delete a gallery item and remove its corresponding storage object.
export async function deleteGalleryPhotoAction(id: number): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Konfigurasi Supabase belum terpasang di server.",
    };
  }

  const safeId = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(safeId) || safeId <= 0) {
    return {
      success: false,
      message: "ID foto galeri tidak valid.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      success: false,
      message: "Koneksi database tidak tersedia.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
    };
  }

  const { data: allowlisted } = await supabase
    .from("pengurus_allowlist")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowlisted) {
    return {
      success: false,
      message: "Akses Ditolak: Hanya pengurus terdaftar yang berhak menghapus dokumentasi.",
    };
  }

  // Fetch storage_path before deleting record
  const { data: record } = await supabase
    .from("gallery_items")
    .select("id, storage_path")
    .eq("id", safeId)
    .maybeSingle();

  const { data: deletedRecord, error: deleteError } = await supabase
    .from("gallery_items")
    .delete()
    .eq("id", safeId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    if (deleteError.code === "42501" || deleteError.message.includes("policy")) {
      return {
        success: false,
        message: "Akses Ditolak: Akun Anda tidak memiliki izin untuk menghapus data foto (RLS Policy).",
      };
    }

    return {
      success: false,
      message: "Gagal menghapus data foto: " + deleteError.message,
    };
  }

  if (!deletedRecord) {
    return {
      success: false,
      message: "Data foto tidak ditemukan atau sudah dihapus sebelumnya.",
    };
  }

  if (record?.storage_path) {
    try {
      await supabase.storage.from(GALLERY_STORAGE_BUCKET).remove([record.storage_path]);
    } catch {
      // Ignore storage cleanup error
    }
  }

  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/pengurus/galeri");
  revalidatePath("/admin/galeri");

  return {
    success: true,
    message: "Foto dokumentasi berhasil dihapus.",
  };
}
