export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    nama_blok: string;
    nomor_blok: string;
    nama_kepala_keluarga: string;
    amount: number;
  };
}

// ponytail: Basic regex and length validation for simple residential blocks and integer amounts. Upgrade to Zod or multi-currency if complex schemas or fractional cents are needed.
export function validateIuranInput(data: {
  nama_blok?: unknown;
  nomor_blok?: unknown;
  nama_kepala_keluarga?: unknown;
  amount?: unknown;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const nama_blok = typeof data.nama_blok === "string" ? data.nama_blok.trim() : "";
  const nomor_blok = typeof data.nomor_blok === "string" ? data.nomor_blok.trim() : "";
  const nama_kepala_keluarga =
    typeof data.nama_kepala_keluarga === "string" ? data.nama_kepala_keluarga.trim() : "";
  const rawAmount = typeof data.amount === "string" ? data.amount.trim() : data.amount;

  if (!nama_blok) {
    errors.nama_blok = "Nama blok wajib diisi.";
  } else if (nama_blok.length > 50) {
    errors.nama_blok = "Nama blok maksimal 50 karakter.";
  }

  if (!nomor_blok) {
    errors.nomor_blok = "Nomor blok wajib diisi.";
  } else if (nomor_blok.length > 20) {
    errors.nomor_blok = "Nomor blok maksimal 20 karakter.";
  }

  if (!nama_kepala_keluarga) {
    errors.nama_kepala_keluarga = "Nama kepala keluarga wajib diisi.";
  } else if (nama_kepala_keluarga.length > 100) {
    errors.nama_kepala_keluarga = "Nama kepala keluarga maksimal 100 karakter.";
  }

  const numAmount = Number(rawAmount);
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    errors.amount = "Jumlah iuran wajib diisi.";
  } else if (isNaN(numAmount) || !Number.isInteger(numAmount) || numAmount <= 0) {
    errors.amount = "Jumlah iuran harus berupa bilangan bulat positif (contoh: 50000).";
  } else if (numAmount > 1_000_000_000) {
    errors.amount = "Jumlah iuran melebihi batas wajar (maksimal Rp 1.000.000.000).";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      nama_blok,
      nomor_blok,
      nama_kepala_keluarga,
      amount: numAmount,
    },
  };
}
