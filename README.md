# Sistem Iuran Pengadaan Portal Lingkungan

Aplikasi web modern berbasis **Next.js (App Router + Tailwind CSS)** yang siap di-deploy ke **Vercel** dengan backend **Supabase (PostgreSQL + RLS)**.

Dirancang khusus untuk mencatat iuran swadaya warga secara transparan, ringan, aman, dan mudah digunakan.

---

## 🎯 Fitur Utama & Pembatasan Akses

1. **Input Minimalis Sesuai Kebutuhan**:
   - Form pencatatan hanya menerima: **Nama Blok**, **Nomor Blok**, dan **Jumlah Iuran (Rp)**.
   - Format mata uang Rupiah otomatis dengan preview nilai terbilang.
2. **Transparansi Warga (Akses Publik)**:
   - Warga dapat melihat ringkasan total dana terkumpul dan riwayat iuran secara langsung tanpa perlu login.
   - Hanya kolom yang relevan (`nama_blok`, `nomor_blok`, `amount`, `created_at`) yang diekspos ke publik; tidak membocorkan ID internal atau data sensitif.
3. **Keamanan Bertingkat (Database-Level RLS)**:
   - Pendaftaran akun publik dinonaktifkan (`public signup disabled`).
   - Hanya user yang ID-nya terdaftar di tabel `pengurus_allowlist` yang diizinkan menambahkan iuran (`INSERT`).
   - Pengguna terotentikasi biasa (yang bukan pengurus terdaftar) tidak dapat menambahkan data iuran.
   - Tidak ada fitur `DELETE` atau `UPDATE` (catatan iuran bersifat append-only / immutable untuk menjaga integritas pembukuan).
   - Anon key publik hanya digunakan sesuai hak RLS; tidak ada service role key yang diekspos ke sisi klien.
4. **Ekspor Excel (.xlsx) Nyata**:
   - Menghasilkan berkas spreadsheet `.xlsx` asli (binary OpenXML) menggunakan library `xlsx`.
   - Berisi nomor urut, nama blok, nomor blok, jumlah iuran, tanggal pencatatan, dan baris total iuran.
5. **Fallback Tanpa Database**:
   - Jika variabel lingkungan Supabase belum dipasang, antarmuka publik menampilkan informasi konfigurasi secara ramah tanpa crash dan tanpa penyimpanan lokal tiruan (no fake mock persistence).

---

## 📋 Struktur Berkas Proyek

```text
iuran-portal/
├── app/
│   ├── api/
│   │   └── export-xlsx/
│   │       └── route.ts          # Endpoint unduh berkas .xlsx asli
│   ├── login/
│   │   └── page.tsx              # Halaman login khusus pengurus
│   ├── pengurus/
│   │   ├── actions.ts            # Server Action (validasi & insert RLS)
│   │   ├── contribution-form.tsx # Form input khusus pengurus (Blok, No, Rp)
│   │   └── page.tsx              # Dasbor terlindungi pengurus (allowlist check)
│   ├── globals.css               # Desain modern Tailwind CSS v4
│   ├── layout.tsx                # Tata letak dasar (bahasa Indonesia)
│   └── page.tsx                  # Halaman rekap iuran publik untuk warga
├── lib/
│   ├── format.ts                 # Pemformat mata uang IDR & tanggal
│   ├── types.ts                  # Deklarasi tipe TypeScript
│   ├── validation.ts             # Validasi ketat server-side
│   └── supabase/
│       ├── client.ts             # Browser Supabase Client (Anon Key)
│       ├── config.ts             # Pemeriksa kelengkapan variabel lingkungan
│       └── server.ts             # SSR Supabase Client untuk Server Action & RSC
├── supabase/
│   └── schema.sql                # Skema DDL tabel & kebijakan RLS
├── tests/
│   └── run_checks.mjs            # Pengujian validasi input & integritas XLSX
├── .env.example                  # Template variabel lingkungan Supabase
├── middleware.ts                 # Penjaga sesi otentikasi Supabase
├── package.json
└── README.md
```

---

## 🚀 Panduan Setup & Penerapan (Langkah demi Langkah)

### 1. Buat Proyek di Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com).
2. Buat proyek baru (*New Project*). Simpan kata sandi database Anda.
3. Buka menu **Project Settings** -> **API**, lalu catat:
   - **Project URL** (`https://xxxxxxxx.supabase.co`)
   - **anon / public key** (`eyJhbGciOi...`)

### 2. Terapkan Skema Database & RLS
Buka menu **SQL Editor** pada dashboard Supabase Anda, salin isi berkas `supabase/schema.sql`, dan klik **Run**.

Skrip ini akan:
- Membuat tabel `public.pengurus_allowlist` (ID pengurus yang berhak).
- Membuat tabel `public.iuran` (catatan iuran).
- Mengaktifkan Row Level Security (RLS).
- Memberikan izin `SELECT` publik untuk rekap iuran.
- Mengunci `INSERT` pada tabel `iuran` **hanya** untuk akun yang terdaftar di `pengurus_allowlist`.

### 3. Matikan Pendaftaran Publik (Disable Public Signup)
1. Buka menu **Authentication** -> **Providers** -> **Email**.
2. Nonaktifkan opsi **"Allow new users to sign up"** (atau pastikan hanya admin yang dapat membuat user).
3. Klik **Save**.

### 4. Daftarkan Pengurus Secara Manual (Allowlist Provisioning)
1. Buka menu **Authentication** -> **Users**.
2. Klik **Add User** -> **Create User**.
3. Masukkan Email dan Kata Sandi pengurus (misal: `pengurus@lingkungan.id`).
4. Setelah user terbuat, salin nilai **User UID** pengguna tersebut.
5. Buka kembali **SQL Editor** dan jalankan perintah berikut:
   ```sql
   insert into public.pengurus_allowlist (user_id, email)
   values ('GANTI_DENGAN_USER_UID', 'pengurus@lingkungan.id');
   ```
Akun pengurus kini resmi diizinkan untuk login dan mencatat iuran warga.

---

## 💻 Menjalankan di Komputer Lokal

1. Salin berkas konfigurasi lingkungan:
   ```bash
   cp .env.example .env.local
   ```
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dengan kredensial dari langkah 1.
3. Jalankan server pengembang:
   ```bash
   npm run dev
   ```
4. Buka peramban di `http://localhost:3000`.

---

## ☁️ Deployment ke Vercel

1. Unggah repositori ke GitHub / GitLab.
2. Masuk ke [Vercel](https://vercel.com) dan impor repositori.
3. Pada bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` : URL proyek Supabase Anda.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Kunci anon publik Supabase Anda.
4. Klik **Deploy**.

---

## 🧪 Verifikasi & Pengujian

Jalankan pemeriksaan lokal otomatis:
```bash
# Uji validasi input & pembuatan berkas Excel (.xlsx)
npm test

# Pemeriksaan tipe TypeScript
npx tsc --noEmit

# Pemeriksaan linter ESLint
npm run lint
```
