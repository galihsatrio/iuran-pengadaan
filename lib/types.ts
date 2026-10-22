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
  show_expenses_on_home?: boolean;
  show_donations_on_home?: boolean;
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

export interface PublicExpense {
  id: number;
  date: string;
  description: string;
  amount: number;
  procurement_group?: string | null;
}

export interface ExpenseRecord extends PublicExpense {
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ExpenseInput {
  date: string;
  description: string;
  amount: number;
  procurement_group?: string | null;
}

export interface BatchExpenseItemInput {
  description: string;
  amount: number;
}

export interface BatchExpenseInput {
  date: string;
  procurement_group?: string | null;
  items: BatchExpenseItemInput[];
}

export type GalleryCategory = "kegiatan" | "hasil";

export interface PublicGalleryItem {
  id: number;
  title: string;
  category: GalleryCategory;
  caption: string | null;
  image_url: string;
  created_at: string;
}

export interface GalleryItem extends PublicGalleryItem {
  storage_path: string;
  created_by?: string | null;
}

export interface GalleryInput {
  title: string;
  category: GalleryCategory;
  caption?: string | null;
}




