# Product Requirements Document (PRD)
## Portal Iuran Warga Lingkungan

**Status:** Draft  
**Owner:** Pengurus Lingkungan  
**Target Platform:** Web (Next.js, Vercel, Supabase)  

---

### 1. Ringkasan Eksekutif (Executive Summary)
Portal Iuran Warga Lingkungan adalah aplikasi web sederhana dan transparan untuk pencatatan serta rekapitulasi iuran warga. Solusi ini menggantikan pencatatan manual berbasis buku/kertas dengan sistem terpusat. Warga umum dapat melihat rekapitulasi dan mengunduh laporan Excel (XLSX) secara transparan tanpa perlu masuk (login). Penginputan pembayaran dibatasi khusus untuk pengurus lingkungan terverifikasi melalui autentikasi Supabase.

---

### 2. Sasaran & Metrik Keberhasilan (Goals & Success Metrics)

#### Sasaran (Goals)
1. Transparansi total penerimaan iuran bagi seluruh warga lingkungan secara publik.
2. Kecepatan dan kemudahan pencatatan penerimaan iuran tunai/transfer oleh pengurus.
3. Otomatisasi pembentukan laporan rekapitulasi dan file export XLSX tanpa kalkulasi manual.

#### Metrik Keberhasilan (Success Metrics)
1. **Transparansi:** 100% data iuran yang berhasil diinput tampil seketika pada tabel publik tanpa pemotongan kueri (*query truncation*).
2. **Performa Akses:** Rekomendasi target waktu pemuatan halaman utama di bawah 3 detik pada koneksi seluler standar (bersifat saran teknis awal, belum diukur resmi).
3. **Integritas Numerik:** 0 selisih nominal antara total akumulasi pada tampilan web dan isi berkas ekspor XLSX.

---

### 3. Persona & Target Pengguna (User Personas)

1. **Warga Lingkungan (Publik):**
   - Akses: Publik tanpa login (*anonymous*).
   - Kebutuhan: Melihat riwayat pembayaran warga, mengecek status iuran blok sendiri, mengunduh file rekapitulasi XLSX.
2. **Pengurus Lingkungan (Admin / Pencatat):**
   - Akses: Terautentikasi melalui login email/password Supabase Auth yang terdaftar dalam daftar izin (*allowlist*).
   - Kebutuhan: Menginput setoran iuran warga secara cepat dan akurat, melihat rekap total, melakukan logout setelah selesai tugas.

---

### 4. Batasan & Cakupan MVP (Scope & Out-of-Scope)

#### Termasuk dalam MVP (In Scope):
- Tampilan responsif desktop dan mobile (Next.js, Tailwind CSS).
- Halaman publik: Ringkasan total penerimaan, daftar riwayat setoran iuran terbaru, tombol export XLSX.
- Halaman autentikasi pengurus: Login dan logout sederhana (tanpa pendaftaran akun publik/self-signup).
- Form input iuran khusus pengurus: Nama Blok (teks, maks 50 karakter), Nomor Blok (teks, maks 20 karakter), dan Jumlah Setoran (integer positif IDR dalam batas numerik aman JavaScript/Postgres).
- Izinkan pembayaran berulang untuk blok yang sama (misal iuran bulan berbeda atau setoran susulan).
- Penyimpanan otomatis metadata privat: `created_at` (timestamp) dan `created_by` (UUID pengurus pencatat).
- Status UI lengkap: *loading*, *empty state*, *error handling*, dan *success notification*.
- Proteksi keamanan database menggunakan Row Level Security (RLS) Supabase.

#### Tidak Termasuk dalam MVP (Out of Scope):
- Pendaftaran mandiri pengurus (*public signup/registration*).
- Fitur Edit dan Hapus data transaksi iuran via UI (koreksi kesalahan pencatatan dilakukan manual oleh pengurus berwenang via Supabase Dashboard).
- Integrasi pembayaran otomatis (*payment gateway*) atau konfirmasi transfer otomatis.
- Modul pencatatan pengeluaran kas lingkungan (*expenses*).
- Modul penagihan otomatis atau kalkulasi daftar tunggakan per KK (*arrears/tunggakan*).

---

### 5. Cerita Pengguna (User Stories)

1. **US-01 (Warga):** Sebagai warga lingkungan, saya ingin membuka portal tanpa login agar saya dapat melihat rekap total dana iuran yang terkumpul.
2. **US-02 (Warga):** Sebagai warga lingkungan, saya ingin melihat daftar riwayat pembayaran terbaru agar saya tahu pembayaran blok saya telah dicatat.
3. **US-03 (Warga):** Sebagai warga lingkungan, saya ingin mengunduh laporan dalam format Excel (XLSX) agar saya dapat memeriksa rincian pembukuan secara mandiri.
4. **US-04 (Pengurus):** Sebagai pengurus, saya ingin login menggunakan kredensial email/password yang terdaftar agar saya dapat mengakses form pencatatan iuran.
5. **US-05 (Pengurus):** Sebagai pengurus, saya ingin mencatat setoran warga (Nama Blok, Nomor Blok, Jumlah Setoran) agar sistem mencatat penerimaan kas secara otomatis dan valid.
6. **US-06 (Pengurus):** Sebagai pengurus, saya ingin melakukan logout dengan aman setelah selesai menginput data agar perangkat tidak disalahgunakan orang lain.

---

### 6. Tabel Kebutuhan Fungsional (Functional Requirements)

| ID | Modul | Deskripsi Kebutuhan | Peran | Prioritas |
|---|---|---|---|---|
| FR-01 | Rekap Publik | Menampilkan total nominal keseluruhan iuran yang terkumpul secara tepat dan terformat Rupiah (IDR). | Publik | P0 (Harus Ada) |
| FR-02 | Tabel Transaksi | Menampilkan tabel transaksi terbaru mencakup: Nama Blok, Nomor Blok, Jumlah Pembayaran, Tanggal Pencatatan. Tidak ada pemotongan kueri (*no query truncation*). | Publik | P0 (Harus Ada) |
| FR-03 | Ekspor XLSX | Menyediakan tombol unduh file XLSX berisi seluruh data transaksi yang tersimpan dan total yang valid secara numerik. | Publik | P0 (Harus Ada) |
| FR-04 | Autentikasi | Form login email dan password terintegrasi Supabase Auth. Sesi dipertahankan dan tombol logout tersedia. Tidak ada opsi registrasi publik. | Pengurus | P0 (Harus Ada) |
| FR-05 | Input Data | Form penginputan iuran dengan 3 field: Nama Blok (teks, maks 50 karakter), Nomor Blok (teks, maks 20 karakter), Jumlah Iuran (integer positif, IDR). | Pengurus | P0 (Harus Ada) |
| FR-06 | Multi-Payment | Memperbolehkan input berulang untuk kombinasi Nama Blok dan Nomor Blok yang sama. | Pengurus | P0 (Harus Ada) |
| FR-07 | Metadata Otomatis | Sistem otomatis merekam timestamp transaksi dan UUID pengurus pencatat (`created_by`) di latar belakang tanpa terekspos ke publik. | Pengurus | P0 (Harus Ada) |
| FR-08 | Respon UI | Menyediakan feedback antarmuka yang jelas: indikator *loading*, pesan *empty state* saat belum ada data, pesan *error* saat gagal, dan notifikasi sukses input. | Publik / Pengurus | P0 (Harus Ada) |

---

### 7. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Keamanan (Security):**
   - Aturan Supabase Row Level Security (RLS) wajib aktif dan ketat: operasi SELECT dibuka untuk publik, operasi INSERT ditolak untuk anonim/pengguna tanpa izin dan hanya diizinkan untuk admin terautentikasi yang ada di *allowlist*.
   - Tidak ada kredensial sensitif atau *secret keys* Supabase (`service_role_key`) yang terekspos pada sisi klien/browser publik. Hanya `anon_key` publik yang disertakan.
   - Kolom sensitif audit (`created_by`) diproteksi agar tidak terekspos dalam kueri publik.
2. **Kinerja & Responsivitas (Performance & Responsive):**
   - Antarmuka web responsif optimal pada tampilan mobile (smartphone) maupun desktop.
   - Pemuatan awal bersih dari *hydration mismatch* antara server-side rendering dan client-side rendering Next.js.
3. **Integritas Data (Data Integrity):**
   - Nilai nominal nominal iuran harus berada dalam batas aman numerik integer (menghindari overflow numerik).
   - Kalkulasi total di web dan hasil kalkulasi pada file XLSX harus sinkron dan valid secara matematis.

---

### 8. Alur Pengguna (User Flows)

#### Alur 1: Warga Melihat Rekap & Ekspor XLSX
1. Warga mengakses URL Portal Iuran di browser.
2. Halaman menampilkan ringkasan total penerimaan iuran dan tabel daftar pembayaran terbaru.
3. Warga menekan tombol **"Unduh Laporan Excel (XLSX)"**.
4. Sistem memproses seluruh data transaksi dan mengunduh file spreadsheet ke perangkat warga.

#### Alur 2: Pengurus Login & Menginput Iuran
1. Pengurus membuka URL / halaman login portal.
2. Pengurus memasukkan email dan password yang telah didaftarkan pada *allowlist*.
3. Sistem memvalidasi kredensial via Supabase Auth.
4. Jika valid, pengurus diarahkan ke dashboard pengurus dengan form input iuran.
5. Pengurus mengisi form:
   - Nama Blok (maks 50 karakter)
   - Nomor Blok (maks 20 karakter)
   - Jumlah Pembayaran (integer positif)
6. Pengurus menekan tombol **"Simpan Pembayaran"**.
7. Sistem menjalankan validasi klien & server, menyimpan data ke Supabase (beserta timestamp dan `created_by`), serta menampilkan notifikasi sukses.
8. Data baru seketika terefleksi pada tabel transaksi dan total rekapitulasi.
9. Pengurus menekan tombol **"Logout"** setelah selesai.

---

### 9. Model & Struktur Data (Data Model)

Tabel Utama: `public.iuran_records`

| Nama Kolom | Tipe Data | Batasan / Aturan | Keterangan |
|---|---|---|---|
| `id` | `uuid` | Primary Key, default `gen_random_uuid()` | ID unik catatan transaksi |
| `nama_blok` | `varchar(50)` | NOT NULL, trim whitespace, length <= 50 | Nama blok / sebutan area warga |
| `nomor_blok` | `varchar(20)` | NOT NULL, trim whitespace, length <= 20 | Nomor rumah / unit warga |
| `jumlah` | `bigint` (atau `numeric`) | NOT NULL, CHECK (`jumlah` > 0) | Nominal pembayaran dalam Rupiah (integer positif) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Waktu transaksi dibuat otomatis |
| `created_by` | `uuid` | NOT NULL, Foreign Key ke `auth.users.id` | ID admin pencatat (metadata privat) |

#### Catatan Model:
- Kombinasi `(nama_blok, nomor_blok)` **tidak unik** (*non-unique*) agar memperbolehkan pembayaran berulang pada blok yang sama.
- RLS Policy:
  - `SELECT`: Diizinkan untuk peranan `anon` dan `authenticated` (kolom `created_by` dapat dikecualikan dari view publik).
  - `INSERT`: Hanya diizinkan jika `auth.role() = 'authenticated'` dan ID pengguna terdaftar dalam tabel/aturan *allowlist* admin. Ditolak keras (*reject*) untuk peranan `anon` atau non-admin.
  - `UPDATE` / `DELETE`: Dinonaktifkan (disallow all) untuk mencegah manipulasi via antarmuka.

---

### 10. Kriteria Keberterimaan yang Dapat Diuji (Testable Acceptance Criteria)

- [ ] **AC-01 (Akses Tanpa Autentikasi):** Warga dapat membuka halaman utama portal tanpa permintaan login atau redirect ke halaman auth.
- [ ] **AC-02 (Pencegahan Hydration Error):** Halaman utama dimuat dengan bersih pada browser baru (*clean browser*) tanpa pesan kesalahan hydration mismatch pada konsol browser.
- [ ] **AC-03 (Pencegahan Pemotongan Data):** Seluruh data transaksi yang ada di database tampil pada tabel atau pagination tanpa terpotong (*not query truncated*).
- [ ] **AC-04 (Validasi Batas Form):** Form menolak input Nama Blok > 50 karakter, Nomor Blok > 20 karakter, atau Jumlah <= 0 atau format non-integer.
- [ ] **AC-05 (Multi-Setoran Blok Sama):** Sistem sukses menyimpan pembayaran baru untuk Nama Blok dan Nomor Blok yang telah ada sebelumnya di database.
- [ ] **AC-06 (Persistensi & Audit Metadata):** Data yang berhasil disimpan bertahan (*persisted*) di Supabase dengan nilai `created_at` dan `created_by` terisi otomatis.
- [ ] **AC-07 (Penolakan Akses Anonim/Non-Admin pada Database):** Percobaan penulisan data langsung (INSERT) menggunakan *anon key* atau akun terautentikasi non-allowlist ditolak oleh database RLS dengan pesan error otorisasi.
- [ ] **AC-08 (Ketahanan Input Bersamaan):** Ketika dua pengurus menginput pembayaran dalam waktu bersamaan (*concurrent inputs*), kedua record tersimpan utuh dan total kas terakumulasi secara akurat.
- [ ] **AC-09 (Validitas Berkas XLSX):** Berkas Excel yang diekspor dapat dibuka tanpa error, memuat seluruh baris transaksi, serta kalkulasi sum/total sesuai dengan angka pada tampilan web.
- [ ] **AC-10 (Sesi dan Logout):** Menekan tombol logout membersihkan sesi autentikasi dan memblokir pengurus dari akses form input sampai login kembali.

---

### 11. Ketergantungan (Dependencies)

1. **Supabase Cloud / Database:** PostgreSQL, Supabase Auth, dan Supabase Database RLS.
2. **Next.js & React Framework:** Framework rendering antarmuka frontend/backend.
3. **Vercel Platform:** Penyedia layanan hosting dan deployment aplikasi web.
4. **Library Ekspor XLSX:** Library JavaScript (seperti `xlsx` / `exceljs`) untuk menghasilkan spreadsheet di browser/server.

---

### 12. Manajemen Risiko & Mitigasi (Risks & Mitigations)

1. **Persetujuan Publikasi Data Warga (*Public Data Approval*):**
   - *Risiko:* Kekhawatiran privasi warga terhadap pemajangan nama dan nomor blok di portal publik.
   - *Mitigasi:* Mengamankan persetujuan pengurus dan warga lingkungan; portal hanya memuat identitas blok/nomor rumah tanpa mencantumkan nomor telepon, NIK, atau identitas pribadi sensitif lainnya.
2. **Batas Kuota Gratis (*Free Quota Limits*):**
   - *Risiko:* Kuota layanan gratis Supabase dan Vercel terlampaui jika traffic atau volume data melonjak.
   - *Mitigasi:* Membatasi ukuran payload, mengoptimasi query database, serta menyederhanakan build agar tetap berada jauh di bawah batas *free tier*.
3. **Koreksi Kesalahan Data (*Manual Correction*):**
   - *Risiko:* Pengurus salah memasukkan nominal karena ketiadaan fitur Edit/Delete di UI MVP.
   - *Mitigasi:* Pengurus inti yang memiliki akses Supabase Dashboard melakukan koreksi manual langsung pada baris data terkait sesuai berita acara koreksi.
4. **Keamanan Kredensial Awal (*Initial Password Security*):**
   - *Risiko:* Password awal yang didistribusikan saat pembentukan akun pengurus berpotensi bocor jika dibagikan lewat saluran tidak aman.
   - *Mitigasi:* Dokumen PRD dan kode program **tidak memuat kredensial/password aktual**. Pengurus diwajibkan segera mengubah kata sandi default pada saat akses pertama kali.

---

### 13. Rencana Peluncuran (Rollout Plan)

1. **Tahap 1: Verifikasi Lingkungan Lokal & Staging**
   - Setup skema tabel `iuran_records` dan konfigurasi kebijakan RLS di Supabase.
   - Uji alur input, visualisasi, dan ekspor XLSX di staging.
2. **Tahap 2: Sosialisasi Pengurus Lingkungan**
   - Penyediaan akun allowlist untuk para pengurus pencatat.
   - Simulasi input setoran oleh pengurus dan penggantian kata sandi awal.
3. **Tahap 3: Peluncuran Terbatas (Soft Launch)**
   - Rilis URL portal kepada perwakilan pengurus untuk verifikasi live data beberapa transaksi awal.
4. **Tahap 4: Publikasi ke Warga Lingkungan**
   - Pembagian tautan portal ke grup komunikasi warga (WhatsApp grup lingkungan) sebagai sarana rekap transparan.

---

### 14. Pertanyaan Terbuka (Open Questions)

1. Apakah periode iuran (bulan/tahun) perlu distandarisasi menjadi dropdown di fase berikutnya atau tetap mengandalkan timestamp pencatatan?
2. Apakah warga di masa depan membutuhkan pencarian/filter cepat berdasarkan nama atau nomor blok?
3. Apakah diperlukan pengelompokan jenis iuran (misal: iuran sampah, iuran keamanan, iuran sosial)?

---

### 15. Rencana Pengembangan Mendatang (Future Work)

1. Fitur filter riwayat dan pencarian data per blok/periode di halaman publik.
2. Dukungan multi-kategori iuran (iuran kebersihan, kas RW/RT, dana kematian).
3. Modul pencatatan pengeluaran (*expense tracking*) agar warga dapat melihat saldo kas bersih secara real-time.
4. Manajemen akun dan hak akses berjenjang (Super Admin, Petugas Lapangan, Peninjau).
5. Bukti setor digital / kwitansi PDF yang dapat dikirim langsung ke WhatsApp warga.

---

### 16. Catatan Status Dokumen (Document Status Note)

Dokumen ini berstatus **DRAFT KONSEPTUAL** sebagai acuan spesifikasi kebutuhan portal iuran warga. Penyusunan dokumen ini tidak menyatakan atau mengonfirmasi bahwa implementasi sistem maupun deployment aplikasi telah selesai dilaksanakan.
