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
  nama_bendahara?: string;
  no_wa_bendahara?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  updated_at?: string | null;
}

export interface Treasurer {
  id: string;
  name: string;
  wa_number: string;
  qris_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface TreasurerInput {
  name: string;
  wa_number: string;
  is_active: boolean;
}


