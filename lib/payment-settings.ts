import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentSettings } from "./types";

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  qris_image_url: "",
  qris_name: "QRIS Pembayaran Iuran Warga",
  nama_bendahara: "",
  no_wa_bendahara: "",
  bank_name: "Bank BCA",
  account_number: "123-456-7890",
  account_name: "Kas Paguyuban Warga",
  updated_at: null,
};

export async function getPaymentSettings(
  client?: SupabaseClient | null
): Promise<PaymentSettings> {
  if (!client) {
    return { ...DEFAULT_PAYMENT_SETTINGS };
  }

  try {
    const { data, error } = await client
      .from("payment_settings")
      .select("qris_image_url, qris_name, nama_bendahara, no_wa_bendahara, bank_name, account_number, account_name, updated_at")
      .eq("id", "default")
      .maybeSingle();

    if (!error && data) {
      return {
        qris_image_url: data.qris_image_url || DEFAULT_PAYMENT_SETTINGS.qris_image_url,
        qris_name: data.qris_name || DEFAULT_PAYMENT_SETTINGS.qris_name,
        nama_bendahara: data.nama_bendahara ?? DEFAULT_PAYMENT_SETTINGS.nama_bendahara,
        no_wa_bendahara: data.no_wa_bendahara ?? DEFAULT_PAYMENT_SETTINGS.no_wa_bendahara,
        bank_name: data.bank_name ?? DEFAULT_PAYMENT_SETTINGS.bank_name,
        account_number: data.account_number ?? DEFAULT_PAYMENT_SETTINGS.account_number,
        account_name: data.account_name ?? DEFAULT_PAYMENT_SETTINGS.account_name,
        updated_at: data.updated_at ?? null,
      };
    }
  } catch {
    // Return defaults when table not yet migrated, network error, or query fails
  }

  return { ...DEFAULT_PAYMENT_SETTINGS };
}

export async function savePaymentSettings(
  updates: Partial<PaymentSettings>,
  client?: SupabaseClient | null,
  userId?: string
): Promise<{ success: boolean; data?: PaymentSettings; error?: string }> {
  if (!client) {
    return {
      success: false,
      error: "Koneksi database Supabase tidak tersedia.",
    };
  }

  try {
    const current = await getPaymentSettings(client);
    const merged: Record<string, unknown> = {
      id: "default",
      qris_image_url: updates.qris_image_url !== undefined ? updates.qris_image_url : current.qris_image_url,
      qris_name: updates.qris_name !== undefined ? updates.qris_name : current.qris_name,
      nama_bendahara: updates.nama_bendahara !== undefined ? updates.nama_bendahara : current.nama_bendahara,
      no_wa_bendahara: updates.no_wa_bendahara !== undefined ? updates.no_wa_bendahara : current.no_wa_bendahara,
      bank_name: updates.bank_name !== undefined ? updates.bank_name : current.bank_name,
      account_number: updates.account_number !== undefined ? updates.account_number : current.account_number,
      account_name: updates.account_name !== undefined ? updates.account_name : current.account_name,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      merged.updated_by = userId;
    }

    const { data, error } = await client
      .from("payment_settings")
      .upsert(merged, { onConflict: "id" })
      .select("qris_image_url, qris_name, nama_bendahara, no_wa_bendahara, bank_name, account_number, account_name, updated_at")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...(data as Partial<PaymentSettings>),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan pembayaran.",
    };
  }
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  extension?: "png" | "jpg" | "webp";
  mimeType?: string;
}

export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Berkas gambar tidak boleh kosong." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Ukuran berkas melebihi batas maksimal 2MB.",
    };
  }

  // Cek Magic Bytes
  // PNG signature utuh 8 bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // JPEG: FF D8 FF
  const isJpg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  // WEBP: RIFF....WEBP
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (isPng) {
    return { valid: true, extension: "png", mimeType: "image/png" };
  }

  if (isJpg) {
    return { valid: true, extension: "jpg", mimeType: "image/jpeg" };
  }

  if (isWebp) {
    return { valid: true, extension: "webp", mimeType: "image/webp" };
  }

  return {
    valid: false,
    error: "Format berkas tidak didukung. Harap unggah gambar berekstensi PNG, JPG, atau WEBP.",
  };
}
