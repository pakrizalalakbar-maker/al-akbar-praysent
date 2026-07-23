import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecord, PRAYER_TYPES } from '../types';
import { ClipboardList, Download, FileSpreadsheet } from 'lucide-react';

interface ReportsProps {
  records: AttendanceRecord[];
}

export const Reports: React.FC<ReportsProps> = ({ records }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prayerFilter, setPrayerFilter] = useState<string>('Semua');
  const [classFilter, setClassFilter] = useState<string>('Semua');

  const classes = useMemo(() => Array.from(new Set(records.map(r => r.studentClass))).sort(), [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (startDate && r.dateStr < startDate) return false;
      if (endDate && r.dateStr > endDate) return false;
      if (prayerFilter !== 'Semua' && r.prayer !== prayerFilter) return false;
      if (classFilter !== 'Semua' && r.studentClass !== classFilter) return false;
      return true;
    });
  }, [records, startDate, endDate, prayerFilter, classFilter]);

  const exportExcel = () => {
    const rows = filtered.map(r => ({
      Tanggal: r.dateStr,
      Waktu: new Date(r.timestamp).toLocaleTimeString('id-ID'),
      ID: r.studentId,
      Nama: r.studentName,
      Kelas: r.studentClass,
      Ibadah: r.prayer,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Presensi');
    XLSX.writeFile(wb, `laporan-presensi-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Laporan Presensi - Al-Akbar Praysent', 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Tanggal', 'Waktu', 'ID', 'Nama', 'Kelas', 'Ibadah']],
      body: filtered.map(r => [
        r.dateStr,
        new Date(r.timestamp).toLocaleTimeString('id-ID'),
        r.studentId,
        r.studentName,
        r.studentClass,
        r.prayer,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    doc.save(`laporan-presensi-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={24} className="text-emerald-600" /> Laporan Siswa
          </h1>
          <p className="text-gray-500 text-sm">{filtered.length} data ditemukan</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dari Tanggal</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ibadah</label>
          <select value={prayerFilter} onChange={e => setPrayerFilter(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option>Semua</option>
            {PRAYER_TYPES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option>Semua</option>
            {classes.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto max-h-[28rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">Ibadah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{r.dateStr}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(r.timestamp).toLocaleTimeString('id-ID')}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.studentName}</td>
                <td className="px-4 py-3 text-gray-600">{r.studentClass}</td>
                <td className="px-4 py-3 text-gray-600">{r.prayer}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada data untuk filter ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
