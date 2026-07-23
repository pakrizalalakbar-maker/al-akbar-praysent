import React from 'react';
import { HelpCircle } from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <HelpCircle size={24} className="text-emerald-600" /> Bantuan
        </h1>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 text-sm text-gray-600">
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">1. Menambahkan Siswa</h3>
          <p>Buka menu Database → Tambah, atau impor massal lewat file Excel (.xlsx) dengan kolom: id, name, class, gender.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">2. Scan Presensi</h3>
          <p>Buka menu Scanner, pilih jenis ibadah, lalu arahkan kamera ke QR code siswa. Setiap siswa hanya bisa tercatat satu kali per jenis ibadah per hari.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">3. Laporan</h3>
          <p>Menu Laporan Siswa untuk rekap detail per siswa (bisa difilter tanggal/kelas/ibadah, ekspor Excel/PDF). Menu Laporan Guru untuk rekap ringkas per kelas.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">4. Akun & Akses</h3>
          <p>Aplikasi ini memerlukan login. Jika butuh akun baru untuk guru/admin lain, hubungi pengelola aplikasi untuk dibuatkan lewat Supabase Dashboard.</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">5. Data Tersimpan di Cloud</h3>
          <p>Semua data presensi kini tersimpan di server (Supabase), bukan di HP. Artinya data yang sama bisa diakses dan diperbarui dari HP mana pun selama terhubung internet.</p>
        </div>
      </div>
    </div>
  );
};
