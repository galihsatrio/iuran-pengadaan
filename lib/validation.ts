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

export interface BendaharaValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    nama_bendahara: string;
    no_wa_bendahara: string;
  };
}

export interface TreasurerValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    name: string;
    wa_number: string;
    is_active: boolean;
  };
}

export function validateTreasurerInput(data: {
  name?: unknown;
  wa_number?: unknown;
  is_active?: unknown;
}): TreasurerValidationResult {
  const errors: Record<string, string> = {};

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const wa_number = typeof data.wa_number === "string" ? data.wa_number.trim() : "";
  const is_active =
    typeof data.is_active === "boolean"
      ? data.is_active
      : data.is_active === "true" || data.is_active === "on" || data.is_active === "1";

  if (!name) {
    errors.name = "Nama bendahara wajib diisi.";
  } else if (name.length > 100) {
    errors.name = "Nama bendahara maksimal 100 karakter.";
  }

  if (!wa_number) {
    errors.wa_number = "Nomor WhatsApp wajib diisi.";
  } else {
    const cleanWa = wa_number.replace(/[\s-]/g, "");
    if (!/^\+?[0-9]{8,20}$/.test(cleanWa)) {
      errors.wa_number =
        "Format nomor WhatsApp tidak valid. Gunakan format angka yang valid (contoh: 08123456789 atau 628123456789).";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      name,
      wa_number,
      is_active,
    },
  };
}


export function validateBendaharaInput(data: {
  nama_bendahara?: unknown;
  no_wa_bendahara?: unknown;
}): BendaharaValidationResult {
  const errors: Record<string, string> = {};

  const nama_bendahara =
    typeof data.nama_bendahara === "string" ? data.nama_bendahara.trim() : "";
  const no_wa_bendahara =
    typeof data.no_wa_bendahara === "string" ? data.no_wa_bendahara.trim() : "";

  if (nama_bendahara.length > 100) {
    errors.nama_bendahara = "Nama bendahara maksimal 100 karakter.";
  }

  if (no_wa_bendahara) {
    // Normalisasi format nomor WhatsApp/telepon
    // Izinkan format: 08..., +62..., 62...
    const cleanWa = no_wa_bendahara.replace(/[\s-]/g, "");
    if (!/^\+?[0-9]{8,20}$/.test(cleanWa)) {
      errors.no_wa_bendahara =
        "Format nomor WhatsApp tidak valid. Gunakan format angka yang valid (contoh: 08123456789 atau 628123456789).";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      nama_bendahara,
      no_wa_bendahara,
    },
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
