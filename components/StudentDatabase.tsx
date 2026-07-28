import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';
import { Student } from '../types';
import { StorageService } from '../services/storage';
import {
  Users, Plus, Upload, Trash2, Pencil, Search, X, Loader2,
  QrCode, Printer, Download, FileDown, AlertTriangle, CheckSquare, Square,
} from 'lucide-react';

interface StudentDatabaseProps {
  students: Student[];
  setStudents: (students: Student[]) => void;
}

const emptyForm: Student = { id: '', name: '', class: '', gender: 'L' };

export const StudentDatabase: React.FC<StudentDatabaseProps> = ({ students, setStudents }) => {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Semua');
  const [form, setForm] = useState<Student>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- pilih siswa (untuk hapus/cetak sebagian) ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- state untuk generate/cetak barcode ---
  const [barcodeStudent, setBarcodeStudent] = useState<Student | null>(null);
  const [bulkPrintList, setBulkPrintList] = useState<Student[] | null>(null);
  const singleCanvasWrapRef = useRef<HTMLDivElement>(null);

  // --- state hapus semua (danger zone) ---
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');

  const refresh = async () => {
    const fresh = await StorageService.getStudents();
    setStudents(fresh);
  };

  const classes = useMemo(() => Array.from(new Set(students.map(s => s.class))).sort(), [students]);

  const filtered = students.filter(
    s =>
      (classFilter === 'Semua' || s.class === classFilter) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.class.toLowerCase().includes(search.toLowerCase()))
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach(s => next.delete(s.id));
      } else {
        filtered.forEach(s => next.add(s.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

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
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await refresh();
    setBusy(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} siswa terpilih dari database? Riwayat presensi mereka juga akan ikut terhapus.`)) return;
    setBusy(true);
    try {
      await StorageService.deleteStudentsBulk(Array.from(selectedIds));
      clearSelection();
      await refresh();
    } catch (err) {
      alert('Gagal menghapus data terpilih.');
      console.error(err);
    }
    setBusy(false);
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'HAPUS') return;
    setBusy(true);
    try {
      await StorageService.deleteAllStudents();
      clearSelection();
      await refresh();
      setShowDeleteAll(false);
      setDeleteAllConfirmText('');
    } catch (err) {
      alert('Gagal menghapus seluruh data.');
      console.error(err);
    }
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
  // PENTING: konten barcode/QR SELALU berupa ID/NIS siswa apa adanya. Selama ID
  // siswa tidak diubah, generate ulang barcode akan selalu menghasilkan isi yang
  // SAMA PERSIS dengan kartu lama yang sudah dicetak — jadi kartu fisik lama
  // (termasuk yang masa aktifnya masih berjalan) tetap terbaca oleh scanner.
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
    setBulkPrintList(null);
    window.print();
  };

  // Cetak barcode: kalau ada yang dicentang -> cetak yang dicentang saja.
  // Kalau tidak ada yang dicentang -> cetak sesuai hasil filter (search/kelas) saat ini.
  const printBarcodes = (list: Student[]) => {
    if (list.length === 0) {
      alert('Tidak ada siswa untuk dicetak barcode-nya.');
      return;
    }
    setBarcodeStudent(null);
    setBulkPrintList(list);
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
            onClick={() => printBarcodes(selectedIds.size > 0 ? students.filter(s => selectedIds.has(s.id)) : filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer size={16} /> {selectedIds.size > 0 ? `Cetak Terpilih (${selectedIds.size})` : 'Cetak Barcode (sesuai filter)'}
          </button>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau ID..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm sm:w-48"
        >
          <option value="Semua">Semua Kelas</option>
          {classes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Bar aksi massal - muncul kalau ada yang dicentang */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-emerald-800 font-medium">{selectedIds.size} siswa dipilih</span>
          <div className="flex gap-2">
            <button onClick={clearSelection} className="px-3 py-1.5 text-gray-600 hover:text-gray-800 font-medium">
              Batal
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 size={14} /> Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 w-8">
                <button onClick={toggleSelectAllFiltered} className="text-gray-400 hover:text-emerald-600">
                  {allFilteredSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">JK</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(s => (
              <tr key={s.id} className={`hover:bg-gray-50 ${selectedIds.has(s.id) ? 'bg-emerald-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleSelect(s.id)} className="text-gray-400 hover:text-emerald-600">
                    {selectedIds.has(s.id) ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                  </button>
                </td>
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Belum ada data siswa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Zona berbahaya: hapus semua data */}
      <div className="border border-red-100 bg-red-50/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Zona Berbahaya</p>
            <p className="text-xs text-red-600">Hapus SELURUH data siswa & riwayat presensinya. Tidak bisa dibatalkan.</p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteAll(true)}
          className="shrink-0 flex items-center gap-2 bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
        >
          Hapus Semua Data
        </button>
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

      {/* Modal hapus semua data (konfirmasi ketik "HAPUS") */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => {
                setShowDeleteAll(false);
                setDeleteAllConfirmText('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle size={20} />
              <h2 className="text-lg font-bold">Hapus Semua Data?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ini akan menghapus <b>seluruh {students.length} data siswa</b> beserta <b>semua riwayat presensi</b> mereka
              secara permanen. Tindakan ini <b>tidak bisa dibatalkan</b>.
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ketik <span className="font-mono font-bold">HAPUS</span> untuk konfirmasi:
            </label>
            <input
              value={deleteAllConfirmText}
              onChange={e => setDeleteAllConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
              placeholder="HAPUS"
            />
            <button
              onClick={handleDeleteAll}
              disabled={deleteAllConfirmText !== 'HAPUS' || busy}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Ya, Hapus Semua Data
            </button>
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
            <p className="text-xs text-gray-400 mb-4">Kode ini berisi ID/NIS siswa — sama persis dengan kartu lama bila ID tidak diubah.</p>

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

      {/* Area cetak massal / terpilih / per kelas (disembunyikan di layar, muncul saat print) */}
      {bulkPrintList && (
        <div id="printable-barcodes" className="grid grid-cols-3 gap-4 p-4">
          {bulkPrintList.map(s => (
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
