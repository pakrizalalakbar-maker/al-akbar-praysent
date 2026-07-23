import React, { useMemo, useState } from 'react';
import { AttendanceRecord, PRAYER_TYPES } from '../types';
import { UserCheck } from 'lucide-react';

interface TeacherReportsProps {
  records: AttendanceRecord[];
}

// Rekap kehadiran per kelas per jenis ibadah - untuk laporan ke guru/wali kelas
export const TeacherReports: React.FC<TeacherReportsProps> = ({ records }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const dayRecords = useMemo(() => records.filter(r => r.dateStr === date), [records, date]);

  const recap = useMemo(() => {
    const byClass: Record<string, Record<string, number>> = {};
    dayRecords.forEach(r => {
      if (!byClass[r.studentClass]) {
        byClass[r.studentClass] = {};
        PRAYER_TYPES.forEach(p => (byClass[r.studentClass][p] = 0));
      }
      byClass[r.studentClass][r.prayer] = (byClass[r.studentClass][r.prayer] ?? 0) + 1;
    });
    return byClass;
  }, [dayRecords]);

  const classNames = Object.keys(recap).sort();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserCheck size={24} className="text-emerald-600" /> Laporan Guru
          </h1>
          <p className="text-gray-500 text-sm">Rekap kehadiran per kelas untuk tanggal terpilih</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Kelas</th>
              {PRAYER_TYPES.map(p => (
                <th key={p} className="px-4 py-3 font-medium text-center">{p}</th>
              ))}
              <th className="px-4 py-3 font-medium text-center">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classNames.map(cls => {
              const total = PRAYER_TYPES.reduce((sum, p) => sum + (recap[cls][p] ?? 0), 0);
              return (
                <tr key={cls} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{cls}</td>
                  {PRAYER_TYPES.map(p => (
                    <td key={p} className="px-4 py-3 text-center text-gray-600">{recap[cls][p] ?? 0}</td>
                  ))}
                  <td className="px-4 py-3 text-center font-bold text-emerald-700">{total}</td>
                </tr>
              );
            })}
            {classNames.length === 0 && (
              <tr>
                <td colSpan={PRAYER_TYPES.length + 2} className="px-4 py-8 text-center text-gray-400">
                  Belum ada presensi pada tanggal ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
