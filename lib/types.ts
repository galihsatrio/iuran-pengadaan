export interface IuranRecord {
  id: number;
  nama_blok: string;
  nomor_blok: string;
  nama_kepala_keluarga: string;
  amount: number;
  created_at: string;
}

export interface IuranInput {
  nama_blok: string;
  nomor_blok: string;
  nama_kepala_keluarga: string;
  amount: number;
}

export interface PaymentSettings {
  qris_image_url?: string;
  qris_name?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  updated_at?: string | null;
}

