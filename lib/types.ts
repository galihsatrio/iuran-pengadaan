export interface IuranRecord {
  id: number;
  nama_blok: string;
  nomor_blok: string;
  amount: number;
  created_at: string;
}

export interface IuranInput {
  nama_blok: string;
  nomor_blok: string;
  amount: number;
}
