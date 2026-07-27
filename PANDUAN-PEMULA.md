# Panduan Lengkap untuk Pemula — Al-Akbar Praysent (Versi Cloud)

Panduan ini ditulis untuk yang **belum pernah sama sekali** pakai Supabase, GitHub, atau Netlify.
Ikuti dari atas ke bawah, jangan lompat. Setiap langkah saya kasih tahu persis
tombol/menu apa yang harus diklik dan namanya apa.

Total ada **4 tahap besar**:
1. Bikin "gudang data" online (Supabase)
2. Naikkan kode aplikasi ke GitHub
3. Bikin aplikasinya online (Netlify)
4. Tes aplikasi

---

## TAHAP 1: Bikin Gudang Data Online (Supabase)

### 1.1 Daftar akun
1. Buka **https://supabase.com** di browser.
2. Klik tombol **"Start your project"** (biasanya di kanan atas atau tengah halaman).
3. Login pakai akun GitHub atau email kamu. Kalau belum punya akun GitHub, pilih daftar pakai email saja.

### 1.2 Bikin project baru
1. Setelah masuk ke dashboard, cari dan klik tombol **"New project"**.
2. Isi form yang muncul:
   - **Name**: bebas, contoh `al-akbar-praysent`
   - **Database Password**: buat password, lalu **SIMPAN di notes/catatan HP kamu** — ini penting dan tidak ditampilkan lagi nanti.
   - **Region**: pilih yang paling dekat, misal `Southeast Asia (Singapore)`.
3. Klik **"Create new project"**.
4. Tunggu 1-2 menit sampai project selesai dibuat (ada animasi loading).

### 1.3 Bikin tabel data (jalankan skrip)
1. Di sisi kiri layar (sidebar), cari menu **"SQL Editor"** (ikonnya seperti `</>`), klik.
2. Klik tombol **"New query"**.
3. Buka file `supabase/schema.sql` yang ada di folder project ini (buka pakai Notepad/TextEdit biasa), lalu **select all → copy** seluruh isinya.
4. **Paste** ke kotak putih besar di SQL Editor Supabase tadi.
5. Klik tombol **"Run"** (biasanya di kanan bawah, atau tekan Ctrl+Enter).
6. Kalau muncul tulisan **"Success"**, berarti berhasil. Tabel `students` dan `attendance_records` sudah jadi.

### 1.4 Bikin akun login untuk admin/guru
1. Di sidebar kiri, cari menu **"Authentication"**, klik.
2. Pastikan kamu ada di tab **"Users"**.
3. Klik tombol **"Add user"** (biasanya di kanan atas), pilih **"Create new user"**.
4. Isi **Email** dan **Password** untuk admin/guru pertama.
5. Centang/pastikan **"Auto Confirm User"** aktif (supaya tidak perlu verifikasi email).
6. Klik **"Create user"**.
7. Ulangi langkah ini untuk setiap admin/guru yang butuh akses.

📝 **Catat email + password ini** — ini yang dipakai untuk login ke aplikasi nanti (bukan bikin akun baru sendiri di aplikasinya).

### 1.5 Ambil "kunci" untuk menghubungkan aplikasi ke Supabase
1. Di sidebar kiri, cari ikon gerigi ⚙️ **"Project Settings"**, klik.
2. Klik submenu **"API"** (atau kadang muncul tombol **"Connect"** di bagian atas dashboard — keduanya menuju halaman yang sama).
3. Di halaman ini kamu akan lihat dua nilai penting:
   - **Project URL** → bentuknya seperti `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key** → deretan huruf/angka panjang di bagian **"Project API keys"**
4. **Copy kedua nilai ini**, tempel sementara di Notes HP/catatan — akan dipakai di Tahap 2.

✅ **Tahap 1 selesai.**

---

## TAHAP 2: Naikkan Kode Aplikasi ke GitHub

GitHub itu tempat "menitipkan" kode supaya Netlify bisa mengambilnya. Tidak perlu paham command line — kita pakai cara upload lewat browser saja.

### 2.1 Daftar akun GitHub (kalau belum punya)
1. Buka **https://github.com** → klik **"Sign up"** → ikuti instruksinya.

### 2.2 Isi kunci Supabase ke file project (SEBELUM upload)
1. Di folder project (hasil download dari saya), buka file **`.env.local`** pakai Notepad/TextEdit.
2. Ganti isinya jadi:
   ```
   VITE_SUPABASE_URL=<tempel Project URL dari langkah 1.5>
   VITE_SUPABASE_ANON_KEY=<tempel anon public key dari langkah 1.5>
   ```
3. Simpan file (Ctrl+S / Cmd+S).

### 2.3 Buat repository baru
1. Login ke GitHub → klik ikon **"+"** di kanan atas → pilih **"New repository"**.
2. Isi **Repository name**, contoh: `al-akbar-praysent`.
3. Pilih **Private** (supaya kode tidak dilihat publik).
4. Klik **"Create repository"**.

### 2.4 Upload file project
1. Di halaman repository yang baru dibuat, cari link kecil bertuliskan **"uploading an existing file"** (biasanya muncul di tengah halaman kosong).
2. **Buka folder project** di komputer kamu (hasil extract file zip dari saya), **select semua file & folder di dalamnya** (bukan folder itu sendiri, tapi isinya), lalu **drag & drop** ke halaman GitHub tadi.
3. Tunggu semua file selesai ter-upload (progress bar).
4. Scroll ke bawah, klik tombol hijau **"Commit changes"**.

✅ **Tahap 2 selesai.** Kode kamu sekarang ada di GitHub.

---

## TAHAP 3: Bikin Aplikasinya Online (Netlify)

### 3.1 Daftar akun
1. Buka **https://app.netlify.com** → klik **"Sign up"** → pilih **"Sign up with GitHub"** (paling gampang, otomatis terhubung).

### 3.2 Hubungkan ke repository GitHub kamu
1. Di dashboard Netlify, klik tombol **"Add new project"**.
2. Pilih **"Import an existing project"**.
3. Klik **"GitHub"**, lalu ikuti izin akses yang diminta (klik **"Authorize"**).
4. Cari dan klik nama repository yang tadi kamu buat (`al-akbar-praysent`).

### 3.3 Atur pengaturan build
Di halaman pengaturan yang muncul, isi:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

Jangan klik Deploy dulu — lanjut ke langkah berikutnya.

### 3.4 Masukkan kunci Supabase (WAJIB, kalau lewat aplikasi tidak akan jalan)
1. Masih di halaman yang sama, cari bagian **"Environment variables"** (atau klik **"Show advanced"** kalau tidak terlihat) → klik **"New variable"**.
2. Tambahkan dua variabel:
   - Key: `VITE_SUPABASE_URL` → Value: (Project URL dari langkah 1.5)
   - Key: `VITE_SUPABASE_ANON_KEY` → Value: (anon public key dari langkah 1.5)
3. Kalau kamu tidak menemukan bagian ini saat setup awal, tenang — bisa ditambahkan setelah deploy lewat: **Project configuration → Environment variables → Add a variable**.

### 3.5 Deploy
1. Klik tombol **"Deploy [nama-site]"**.
2. Tunggu 2-5 menit. Netlify akan menampilkan log proses build.
3. Kalau selesai dan muncul centang hijau ✅, klik link URL yang diberikan (bentuknya `nama-acak.netlify.app`) — itu alamat aplikasi kamu yang sudah online!

💡 Kalau ingin nama domain yang lebih rapi (bukan acak), buka **Domain management** di sidebar Netlify dan ganti nama subdomain-nya.

✅ **Tahap 3 selesai. Aplikasi sudah online!**

---

## TAHAP 4: Tes Aplikasi

1. Buka link `nama-acak.netlify.app` dari HP mana pun.
2. Login pakai email & password yang kamu buat di langkah **1.4**.
3. Coba tambah 1 siswa lewat menu **Database**, lalu buka aplikasi yang sama di **HP lain** dan login — siswa itu harus sudah muncul di sana juga. Kalau muncul, artinya sinkronisasi cloud sudah berhasil. 🎉

---

## Kalau Ada yang Error

- **"Gagal memuat data" / layar putih kosong** → cek lagi apakah `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Netlify (Tahap 3.4) sudah benar, tidak ada spasi tambahan.
- **Build gagal di Netlify** → buka tab **"Deploys"** di Netlify, klik deploy yang gagal (warna merah), baca pesan errornya, lalu kirim pesan errornya ke saya — saya bisa bantu baca.
- **Tidak bisa login** → pastikan akunnya sudah dibuat di Supabase (Tahap 1.4), dan **"Auto Confirm User"** dicentang saat membuatnya.
- **Fitur "Buat Laporan Harian" (AI) tidak jalan** → wajar kalau kamu belum setup Edge Function (bagian opsional di README.md yang butuh instalasi tambahan). Fitur lain tetap jalan normal tanpa ini.

Kalau macet di langkah mana pun, kirim saja **screenshot layar kamu** dan saya bantu jelaskan tombolnya di mana.
