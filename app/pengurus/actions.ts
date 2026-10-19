"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateIuranInput, validateBendaharaInput, validateTreasurerInput } from "@/lib/validation";
import {
  validateImageBuffer,
  MAX_FILE_SIZE_BYTES,
  savePaymentSettings,
} from "@/lib/payment-settings";


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

export async function logoutAction() {
  const supabase = await getServerSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
