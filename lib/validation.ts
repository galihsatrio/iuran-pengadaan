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

export interface HomeExpensesSettingValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    show_expenses_on_home: boolean;
  };
}

export interface HomeVisibilitySettingsValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    show_expenses_on_home?: boolean;
    show_donations_on_home?: boolean;
  };
}

function parseBooleanField(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "on" || raw === "1") return true;
  if (raw === "false" || raw === "off" || raw === "0" || raw === "") return false;
  return null;
}

export function validateHomeVisibilitySettingsInput(data: {
  show_expenses_on_home?: unknown;
  show_donations_on_home?: unknown;
}): HomeVisibilitySettingsValidationResult {
  const errors: Record<string, string> = {};
  const sanitized: { show_expenses_on_home?: boolean; show_donations_on_home?: boolean } = {};

  if (data.show_expenses_on_home !== undefined) {
    const parsed = parseBooleanField(data.show_expenses_on_home);
    if (parsed === null) {
      errors.show_expenses_on_home = "Nilai pengaturan visibilitas pengeluaran tidak valid.";
    } else {
      sanitized.show_expenses_on_home = parsed;
    }
  }

  if (data.show_donations_on_home !== undefined) {
    const parsed = parseBooleanField(data.show_donations_on_home);
    if (parsed === null) {
      errors.show_donations_on_home = "Nilai pengaturan visibilitas sumbangan tidak valid.";
    } else {
      sanitized.show_donations_on_home = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  if (Object.keys(sanitized).length === 0) {
    return {
      valid: false,
      errors: { _general: "Setidaknya satu pengaturan visibilitas harus disediakan." },
    };
  }

  return {
    valid: true,
    errors: {},
    sanitized,
  };
}

export function validateHomeExpensesSettingInput(data: {
  show_expenses_on_home?: unknown;
}): HomeExpensesSettingValidationResult {
  const errors: Record<string, string> = {};
  const raw = data.show_expenses_on_home;

  let parsed: boolean | null = null;
  if (typeof raw === "boolean") {
    parsed = raw;
  } else if (raw === "true" || raw === "on" || raw === "1") {
    parsed = true;
  } else if (raw === "false" || raw === "off" || raw === "0" || raw === "") {
    parsed = false;
  } else {
    errors.show_expenses_on_home = "Nilai pengaturan visibilitas tidak valid.";
  }

  if (Object.keys(errors).length > 0 || parsed === null) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      show_expenses_on_home: parsed,
    },
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

export interface ExpenseValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    date: string;
    description: string;
    amount: number;
    procurement_group: string | null;
  };
}

export interface GalleryValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    title: string;
    category: "kegiatan" | "hasil";
    caption: string | null;
  };
}

export function validateGalleryInput(data: {
  title?: unknown;
  category?: unknown;
  caption?: unknown;
}): GalleryValidationResult {
  const errors: Record<string, string> = {};

  const rawTitle = typeof data.title === "string" ? data.title.trim() : "";
  const rawCategory = typeof data.category === "string" ? data.category.trim().toLowerCase() : "";
  const rawCaption = typeof data.caption === "string" ? data.caption.trim() : "";

  if (!rawTitle) {
    errors.title = "Judul foto wajib diisi.";
  } else if (rawTitle.length > 150) {
    errors.title = "Judul foto maksimal 150 karakter.";
  }

  if (!rawCategory) {
    errors.category = "Kategori foto wajib dipilih.";
  } else if (rawCategory !== "kegiatan" && rawCategory !== "hasil") {
    errors.category = "Kategori foto harus 'kegiatan' atau 'hasil'.";
  }

  if (rawCaption && rawCaption.length > 500) {
    errors.caption = "Keterangan foto maksimal 500 karakter.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      title: rawTitle,
      category: rawCategory as "kegiatan" | "hasil",
      caption: rawCaption || null,
    },
  };
}

export function validateExpenseInput(data: {
  date?: unknown;
  description?: unknown;
  amount?: unknown;
  procurement_group?: unknown;
}): ExpenseValidationResult {
  const errors: Record<string, string> = {};

  const rawDate = typeof data.date === "string" ? data.date.trim() : "";
  const rawDesc = typeof data.description === "string" ? data.description.trim() : "";
  const rawAmount = typeof data.amount === "string" ? data.amount.trim() : data.amount;
  const rawGroup = typeof data.procurement_group === "string" ? data.procurement_group.trim() : "";

  if (!rawDate) {
    errors.date = "Tanggal pengeluaran wajib diisi.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    errors.date = "Format tanggal harus YYYY-MM-DD (contoh: 2025-10-19).";
  } else {
    const [y, m, d] = rawDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (
      isNaN(dateObj.getTime()) ||
      dateObj.getFullYear() !== y ||
      dateObj.getMonth() !== m - 1 ||
      dateObj.getDate() !== d
    ) {
      errors.date = "Tanggal kalender tidak valid.";
    }
  }

  if (!rawDesc) {
    errors.description = "Keterangan pengeluaran wajib diisi.";
  } else if (rawDesc.length > 255) {
    errors.description = "Keterangan pengeluaran maksimal 255 karakter.";
  }

  const numAmount = Number(rawAmount);
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    errors.amount = "Nominal pengeluaran wajib diisi.";
  } else if (isNaN(numAmount) || !Number.isInteger(numAmount) || numAmount <= 0) {
    errors.amount = "Nominal pengeluaran harus berupa bilangan bulat positif (contoh: 50000).";
  } else if (numAmount > 1_000_000_000) {
    errors.amount = "Nominal pengeluaran melebihi batas wajar (maksimal Rp 1.000.000.000).";
  }

  if (rawGroup && rawGroup.length > 100) {
    errors.procurement_group = "Nama kelompok pengadaan maksimal 100 karakter.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      date: rawDate,
      description: rawDesc,
      amount: numAmount,
      procurement_group: rawGroup || null,
    },
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
