# Dashboard Absensi Kontak OJK 157

Dashboard interaktif untuk memonitoring kehadiran petugas Kontak OJK 157. Aplikasi ini dibangun dengan React (Vite), Tailwind CSS, Recharts, dan terhubung dengan basis data Supabase untuk manajemen data real-time.

## Fitur Utama

- **Real-time Synchronization:** Menampilkan data langsung dari Supabase.
- **Role-Based Access Control (RBAC):** Login Petugas (Read-Only) dan Admin (Create, Update, Delete).
- **Pengaturan Waktu Shift:** Fitur fleksibel untuk mengatur jam masuk dan pulang karyawan (Non-Shift dan Shift 1 - 4).
- **Interactive Drill-down Summary Cards:** Klik kartu metrik pada dashboard (seperti Terlambat, TAM, TAP) untuk langsung menyaring (filter) data tabel yang berada di bawahnya secara otomatis.
- **Data Visualization:** Menampilkan tren absensi per hari, minggu, atau bulan dan distribusi status kehadiran.

---

## Prasyarat Pengaturan

Proyek ini memerlukan Supabase. Buat proyek di [Supabase](https://supabase.com) dan jalankan querry SQL ini di fitur SQL Editor Supabase untuk membuat tabel yang dibutuhkan:

```sql
CREATE TABLE absensi_ojk_157 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nama text NOT NULL,
  tanggal date NOT NULL,
  absen_masuk time,
  absen_pulang time,
  created_at timestamp with time zone DEFAULT now()
);
```

## Konfigurasi Environment Variables

Buka IDE atau text editor, lalu buat file bernama `.env` di **root (folder paling luar) project**.

Isikan kredensial yang dapat Anda ambil dari dashboard project Supabase (Settings -> API):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbxxxxxxxxxx...
```

> **Catatan:** File `.env` sudah dimasukkan ke dalam `.gitignore`, sehingga aman dan tidak akan terpublikasi saat di-push ke GitHub.

---

## Menjalankan Aplikasi Secara Lokal

1. **Clone repository ini** ke komputer Anda:
   ```bash
   git clone <URL_GITHUB_ANDA>
   cd <NAMA_FOLDER>
   ```

2. **Install dependencies**:
   Pastikan Anda sudah menginstal Node.js yang sesuai. Jalankan:
   ```bash
   npm install
   ```
   Atau jika menggunakan Yarn:
   ```bash
   yarn install
   ```

3. **Jalankan dev server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di port `http://localhost:3000` (atau port lain yang direkomendasikan Vite di terminal).

---

## Proses Deployment ke Vercel atau Netlify

Aplikasi ini bersifat **Single Page Application (SPA)** berbasis Vite. Semua deployment tools akan dengan cepat mengenalinya. Anda dapat dengan mudah meng-hostingnya di layanan seperti Vercel atau Netlify tanpa konfigurasi server yang rumit.

### 🚀 Deploy ke Vercel
1. Sinkronkan repositori GitHub Anda di dashboard Vercel.
2. Vercel secara otomatis akan mendeteksi framework Vite.
3. Masukkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada tab **Environment Variables** di Vercel sebelum menekan "Deploy".
4. Klik **Deploy** dan jalankan.

### 🚀 Deploy ke Netlify
1. Pilih **"Import from git"** pada dahboard Netlify.
2. Pilih Github dan arahkan ke branch repositori tersebut.
3. Build command yang disarankan adalah `npm run build` dan Publish directory-nya di `/dist`.
4. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada **Environment Variables** / **Site settings > Environment Variables**.
5. Klik **Deploy Site**.

*Saran Khusus*: Jika aplikasi menggunakan routing (seperti React Router, walau versi ini belum), pastikan Anda menambahkan pengaturan file `_redirects` di directory `public` dengan baris pembuka `/* /index.html 200` (Khusus Netlify) atau melakukan `vercle.json` redirect ke `index.html` (Khusus Vercel) untuk menangani *Direct Navigation SPA error 404*.
