# Al-Akbar Praysent — Versi Cloud (Multi-HP + Login)

Aplikasi presensi shalat siswa. Versi ini sudah tidak lagi menyimpan data
di HP masing-masing — semua data (siswa & presensi) tersimpan di **Supabase**
(cloud database gratis), jadi bisa diakses & disinkronkan dari HP mana pun,
dan dilindungi dengan **login email + password**.

Fitur lama tetap ada semua: Scanner QR, Database Siswa (+ impor Excel),
Laporan Siswa (+ ekspor Excel/PDF), Laporan Guru, Analisis AI, dan Dashboard.
Ditambah: Login, proteksi akses, sinkronisasi multi-perangkat, dan
generate/cetak barcode baru untuk siswa.

**Data siswa tersimpan permanen:** Sekali siswa masuk ke database (lewat impor Excel
atau input manual), datanya tersimpan selamanya di cloud. Tahun ajaran berikutnya,
admin cukup impor Excel berisi siswa BARU saja — siswa lama tidak akan hilang atau
perlu dimasukkan ulang (import bersifat tambah/perbarui, bukan mengganti seluruh data).
Ada juga tombol **"Unduh Template"** (dapat file Excel kosong dengan format kolom yang
benar: NIS, Nama, Kelas, JK) dan **"Ekspor Data"** (backup seluruh data siswa saat ini
ke Excel) di menu Database Siswa. Contoh template asli sekolah juga disertakan di
folder `templates/`.

**Kompatibilitas barcode lama:** Scanner mencocokkan hasil scan langsung
dengan ID/NIS siswa di database (bukan format khusus). Barcode lama tetap
terbaca selama ID siswa di database tidak diubah. Barcode baru yang dibuat
lewat menu Database Siswa juga memakai ID siswa sebagai isinya, jadi otomatis
kompatibel dengan scanner yang sama.

---

## Update: Mode Otomatis/Manual & Notifikasi Sekilas

Menu **Scanner** sekarang punya 2 mode:
- **Otomatis (jam)**: ibadah terdeteksi sendiri berdasarkan jadwal jam yang diatur admin (ikon ⚙ di pojok kanan atas halaman Scanner). Kalau jamnya tumpang tindih dengan ibadah lain (misal Dhuha & Upacara di jam yang sama), sistem akan minta pindah ke mode **Manual**.
- **Manual**: operator memilih sendiri jenis ibadah — dipakai untuk kasus khusus (Senin: Upacara vs Dhuha, dsb).

Notifikasi hasil scan sekarang muncul sebagai **pop-up sekilas** di bagian atas layar (hijau = berhasil, merah = gagal/tidak terdaftar, kuning = sudah absen sebelumnya), otomatis hilang setelah ±2.5 detik.

⚠️ **Kalau project Supabase kamu dibuat SEBELUM update ini**, jalankan dulu file
`supabase/migration-2-jadwal-otomatis.sql` di SQL Editor Supabase (caranya sama
seperti menjalankan `schema.sql` di awal) supaya tabel jadwal ibadah tersedia.
Kalau tabel ini belum ada, mode Otomatis tetap jalan pakai jadwal bawaan (default),
tapi pengaturan lewat ikon ⚙ tidak akan tersimpan sampai migrasi dijalankan.

---

## Langkah Setup (sekali saja)

### 1. Buat akun & project Supabase (gratis)
1. Buka https://supabase.com → daftar/login → **New project**.
2. Catat **Project URL** dan **anon public key** (Project Settings → API). Ini akan dipakai di langkah 4.

### 2. Buat tabel database
1. Di Supabase Dashboard, buka **SQL Editor → New query**.
2. Copy-paste seluruh isi file `supabase/schema.sql` dari project ini, lalu klik **Run**.
   Ini otomatis membuat tabel `students`, `attendance_records`, dan aturan keamanan (RLS)
   yang mewajibkan login untuk mengakses data.

### 3. Buat akun login untuk admin/guru
1. Di Supabase Dashboard → **Authentication → Users → Add user**.
2. Isi email & password untuk tiap admin/guru yang boleh akses aplikasi.
   (Tidak perlu user daftar sendiri — akun dibuatkan manual oleh kamu sebagai pengelola).

### 4. Isi kredensial di project
1. Buka file `.env.local`, ganti dengan nilai dari langkah 1:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=isi_dengan_anon_public_key
   ```

### 5. (Opsional tapi disarankan) Aktifkan fitur Analisis AI dengan aman
Fitur "Buat Laporan Harian" pakai Gemini AI. Supaya API key tidak bocor ke browser,
key-nya disimpan di server (Supabase Edge Function), bukan di kode frontend.

1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Login & hubungkan project:
   ```
   supabase login
   supabase link --project-ref xxxxxxxxxxxx
   ```
3. Deploy function:
   ```
   supabase functions deploy gemini-insight
   ```
4. Set API key Gemini sebagai secret (dapatkan key gratis di https://aistudio.google.com/apikey):
   ```
   supabase secrets set GEMINI_API_KEY=isi_api_key_gemini_kamu
   ```
Kalau langkah ini dilewati, semua fitur lain tetap jalan normal — hanya tombol "Buat Laporan Harian" yang tidak berfungsi.

### 6. Jalankan lokal untuk uji coba
```
npm install
npm run dev
```
Buka `http://localhost:3000`, coba login pakai akun yang dibuat di langkah 3.

### 7. Deploy ke Netlify (tetap gratis)
1. Push folder project ini ke GitHub.
2. Di Netlify: **Add new site → Import an existing project** → hubungkan ke repo GitHub tadi.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Di **Site settings → Environment variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (nilainya sama seperti di `.env.local`)
5. Deploy. Selesai — aplikasi sekarang online, datanya tersinkron real-time di semua HP,
   dan hanya bisa diakses dengan login.

---

## Menambah fitur baru di kemudian hari
Struktur project ini modular:
- `components/` — tiap halaman/fitur adalah satu file (mudah tambah halaman baru)
- `services/storage.ts` — semua akses data terpusat di sini
- `supabase/schema.sql` — tambah kolom/tabel baru di sini kalau butuh data baru

## Struktur Project
```
├── App.tsx                  # Layout utama + routing halaman + auth gate
├── components/
│   ├── Login.tsx             # Halaman login
│   ├── Scanner.tsx           # Scan QR presensi
│   ├── StudentDatabase.tsx   # CRUD siswa + impor Excel
│   ├── Reports.tsx           # Laporan siswa + ekspor
│   ├── TeacherReports.tsx    # Rekap per kelas
│   └── Help.tsx               # Halaman bantuan
├── services/
│   ├── storage.ts            # Akses data ke Supabase (pengganti localStorage)
│   └── geminiService.ts      # Panggil Edge Function untuk analisis AI
├── lib/supabaseClient.ts     # Koneksi ke Supabase
├── supabase/
│   ├── schema.sql             # Skema tabel + RLS
│   └── functions/gemini-insight/  # Edge Function (API key aman di server)
└── types.ts
```
