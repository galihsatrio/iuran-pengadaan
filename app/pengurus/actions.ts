"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateIuranInput } from "@/lib/validation";

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
    message: `Iuran untuk ${validation.sanitized.nama_blok} No. ${validation.sanitized.nomor_blok} berhasil dicatat.`,
  };
}

export async function logoutAction() {
  const supabase = await getServerSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
