import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';
import { Student } from '../types';
import { StorageService } from '../services/storage';
import { Users, Plus, Upload, Trash2, Pencil, Search, X, Loader2, QrCode, Printer, Download, FileDown } from 'lucide-react';

interface StudentDatabaseProps {
  students: Student[];
  setStudents: (students: Student[]) => void;
}

const emptyForm: Student = { id: '', name: '', class: '', gender: 'L' };

export const StudentDatabase: React.FC<StudentDatabaseProps> = ({ students, setStudents }) => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Student>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- state untuk generate/cetak barcode ---
  const [barcodeStudent, setBarcodeStudent] = useState<Student | null>(null);
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const singleCanvasWrapRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const fresh = await StorageService.getStudents();
    setStudents(fresh);
  };

  const filtered = students.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase())
  );

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (s: Student) => {
    setForm(s);
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await StorageService.updateStudent(form);
      } else {
        await StorageService.addStudent(form);
      }
      await refresh();
      setShowForm(false);
    } catch (err) {
      alert('Gagal menyimpan data siswa. ID mungkin sudah dipakai.');
      console.error(err);
    }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus siswa ini dari database?')) return;
    setBusy(true);
    await StorageService.deleteStudent(id);
    await refresh();
    setBusy(false);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleDownloadTemplate = () => {
    const rows = [
      { NIS: 'MSL01', Nama: 'AHMAD DANISH DAVIN AL-KAMIL', Kelas: 'VII', JK: 'L' },
      { NIS: 'MSL02', Nama: 'AIRA ROSMALIA', Kelas: 'VII', JK: 'P' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template-data-siswa.xlsx');
  };

  const handleExportCurrent = () => {
    if (students.length === 0) {
      alert('Belum ada data siswa untuk diekspor.');
      return;
    }
    const rows = students.map(s => ({ NIS: s.id, Nama: s.name, Kelas: s.class, JK: s.gender }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, `data-siswa-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      const imported: Student[] = rows
        .map(row => {
          const id = String(row.id ?? row.ID ?? row.nis ?? row.NIS ?? '').trim();
          const name = String(row.name ?? row.Name ?? row.nama ?? row.Nama ?? '').trim();
          const kelas = String(row.class ?? row.Class ?? row.kelas ?? row.Kelas ?? '').trim();
          const genderRaw = String(row.gender ?? row.Gender ?? row.jk ?? row.JK ?? 'L').trim().toUpperCase();
          const gender: 'L' | 'P' = genderRaw.startsWith('P') ? 'P' : 'L';
          return { id, name, class: kelas, gender };
        })
        .filter(s => s.id && s.name);

      if (imported.length === 0) {
        alert('Tidak ada data valid ditemukan. Pastikan file punya kolom: id, name, class, gender.');
      } else {
        await StorageService.addStudentsBulk(imported);
        await refresh();
        alert(`${imported.length} data siswa berhasil diimpor.`);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal membaca file. Pastikan format .xlsx/.csv sesuai.');
    }
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- BARCODE ---
  // PENTING: konten barcode/QR SELALU berupa ID/NIS siswa apa adanya (sama seperti
  // format barcode lama). Karena itu barcode lama tetap terbaca oleh Scanner,
  // dan barcode baru yang dibuat di sini otomatis kompatibel juga.
  const downloadSingleBarcode = (student: Student) => {
    const canvas = singleCanvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${student.id}-${student.name}.png`;
    a.click();
  };

  const printSingleBarcode = () => {
    setBulkPrintOpen(false);
    window.print();
  };

  const printBulkBarcodes = () => {
    setBarcodeStudent(null);
    setBulkPrintOpen(true);
    // beri waktu render sebelum membuka dialog print
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-emerald-600" /> Database Siswa
          </h1>
          <p className="text-gray-500 text-sm">{students.length} anggota terdaftar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <FileDown size={16} /> Unduh Template
          </button>
          <button
            onClick={handleImportClick}
            disabled={busy}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload size={16} /> Impor Excel
          </button>
          <button
            onClick={handleExportCurrent}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Download size={16} /> Ekspor Data
          </button>
          <button
            onClick={printBulkBarcodes}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer size={16} /> Cetak Semua Barcode
          </button>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, ID, atau kelas..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">JK</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.class}</td>
                <td className="px-4 py-3 text-gray-600">{s.gender}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setBarcodeStudent(s)}
                      title="Buat / cetak barcode"
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                    >
                      <QrCode size={15} />
                    </button>
                    <button onClick={() => openEditForm(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Belum ada data siswa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal tambah/edit siswa */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Edit Siswa' : 'Tambah Siswa'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ID / NIS</label>
                <input
                  required
                  disabled={!!editingId}
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                />
                <p className="text-[11px] text-gray-400 mt-1">ID ini yang akan jadi isi barcode siswa.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
                  <input
                    required
                    value={form.class}
                    onChange={e => setForm({ ...form, class: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg mt-2 disabled:opacity-50"
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Tambah Siswa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal barcode satu siswa */}
      {barcodeStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6 relative text-center">
            <button
              onClick={() => setBarcodeStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            <h2 className="text-base font-bold text-gray-800 mb-1">Barcode Siswa</h2>
            <p className="text-xs text-gray-400 mb-4">Kode ini berisi ID/NIS siswa — kompatibel dengan scanner.</p>

            <div ref={singleCanvasWrapRef} className="flex justify-center mb-3">
              <QRCodeCanvas value={barcodeStudent.id} size={180} level="M" includeMargin />
            </div>
            <p className="font-semibold text-gray-800">{barcodeStudent.name}</p>
            <p className="text-xs text-gray-500 mb-4">{barcodeStudent.class} • {barcodeStudent.id}</p>

            <div className="flex gap-2">
              <button
                onClick={() => downloadSingleBarcode(barcodeStudent)}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <Download size={15} /> PNG
              </button>
              <button
                onClick={printSingleBarcode}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                <Printer size={15} /> Cetak
              </button>
            </div>

            {/* Area khusus yang dicetak (disembunyikan di layar, muncul saat print) */}
            <div id="printable-barcodes" className="hidden print:block fixed inset-0 bg-white p-8">
              <div className="flex flex-col items-center">
                <QRCodeCanvas value={barcodeStudent.id} size={220} level="M" includeMargin />
                <p className="font-bold text-lg mt-3">{barcodeStudent.name}</p>
                <p className="text-sm text-gray-600">{barcodeStudent.class} • {barcodeStudent.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Area cetak massal (disembunyikan di layar, muncul saat print) */}
      {bulkPrintOpen && (
        <div id="printable-barcodes" className="grid grid-cols-3 gap-4 p-4">
          {filtered.map(s => (
            <div key={s.id} className="flex flex-col items-center border border-gray-200 rounded-lg p-3 break-inside-avoid">
              <QRCodeCanvas value={s.id} size={110} level="M" includeMargin />
              <p className="font-semibold text-xs mt-2 text-center">{s.name}</p>
              <p className="text-[10px] text-gray-500">{s.class} • {s.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
