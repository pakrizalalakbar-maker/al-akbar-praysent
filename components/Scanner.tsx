import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student, AttendanceRecord, PrayerType, PrayerScheduleItem, PRAYER_TYPES } from '../types';
import { StorageService } from '../services/storage';
import { QrCode, CheckCircle2, XCircle, Camera, Settings, X, Loader2, Clock } from 'lucide-react';

interface ScannerProps {
  students: Student[];
  onRecordAdded: (record: AttendanceRecord) => void;
}

type ToastState = { type: 'success' | 'error' | 'duplicate'; message: string } | null;
type ScanMode = 'otomatis' | 'manual';

const READER_ID = 'reader';

const DEFAULT_SCHEDULE: PrayerScheduleItem[] = [
  { prayer: 'Subuh', startTime: '04:30', endTime: '05:45' },
  { prayer: 'Dhuha', startTime: '06:30', endTime: '07:30' },
  { prayer: 'Upacara', startTime: '06:30', endTime: '07:30' },
  { prayer: 'Dzuhur', startTime: '12:00', endTime: '12:45' },
  { prayer: 'Ashar', startTime: '15:00', endTime: '15:45' },
  { prayer: 'Maghrib', startTime: '18:00', endTime: '18:30' },
  { prayer: 'Isya', startTime: '19:00', endTime: '19:45' },
  { prayer: 'Jumat', startTime: '11:30', endTime: '13:00' },
];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Cari SEMUA ibadah yang jadwalnya cocok dengan jam sekarang (bisa lebih dari satu,
// misal Dhuha & Upacara jam yang sama -> di sinilah mode Manual dibutuhkan)
const findActivePrayers = (schedule: PrayerScheduleItem[], now: Date): PrayerScheduleItem[] => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return schedule.filter(s => nowMinutes >= toMinutes(s.startTime) && nowMinutes <= toMinutes(s.endTime));
};

export const Scanner: React.FC<ScannerProps> = ({ students, onRecordAdded }) => {
  const [mode, setMode] = useState<ScanMode>('otomatis');
  const [manualPrayer, setManualPrayer] = useState<PrayerType>('Dzuhur');
  const [schedule, setSchedule] = useState<PrayerScheduleItem[]>(DEFAULT_SCHEDULE);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<ToastState>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Muat jadwal dari database (kalau ada), jam berjalan tiap 15 detik
  useEffect(() => {
    StorageService.getPrayerSchedule()
      .then(data => {
        if (data.length > 0) setSchedule(data);
      })
      .catch(() => {
        /* fallback ke jadwal default kalau tabel belum ada / gagal dimuat */
      });
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  const activePrayers = useMemo(() => findActivePrayers(schedule, now), [schedule, now]);
  const autoPrayer: PrayerType | null = activePrayers.length === 1 ? activePrayers[0].prayer : null;
  const isAmbiguous = activePrayers.length > 1;
  const noScheduleMatch = activePrayers.length === 0;

  const effectivePrayer: PrayerType | null = mode === 'manual' ? manualPrayer : autoPrayer;

  const showToast = useCallback((t: NonNullable<ToastState>) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(t);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // aman diabaikan
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (processingRef.current) return;
      if (!effectivePrayer) {
        showToast({ type: 'error', message: 'Tidak ada jadwal ibadah aktif. Pilih mode Manual.' });
        return;
      }
      processingRef.current = true;
      setProcessing(true);

      const studentId = decodedText.trim();
      const student = students.find(s => s.id === studentId);

      if (!student) {
        showToast({ type: 'error', message: `ID "${studentId}" tidak terdaftar di database siswa.` });
        setProcessing(false);
        processingRef.current = false;
        return;
      }

      const scanTime = new Date();
      const dateStr = scanTime.toISOString().split('T')[0];

      try {
        const already = await StorageService.hasRecordToday(student.id, effectivePrayer, dateStr);
        if (already) {
          showToast({ type: 'duplicate', message: `${student.name} sudah tercatat hadir ${effectivePrayer} hari ini.` });
        } else {
          const newRecord = await StorageService.addRecord({
            studentId: student.id,
            studentName: student.name,
            studentClass: student.class,
            timestamp: scanTime.getTime(),
            dateStr,
            prayer: effectivePrayer,
          });
          onRecordAdded(newRecord);
          showToast({ type: 'success', message: `${student.name} (${student.class}) - ${effectivePrayer}` });
        }
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', message: 'Gagal menyimpan data. Cek koneksi internet.' });
      }

      setProcessing(false);
      setTimeout(() => {
        processingRef.current = false;
      }, 2000);
    },
    [students, effectivePrayer, onRecordAdded, showToast]
  );

  const startScanner = useCallback(async () => {
    const html5Qrcode = new Html5Qrcode(READER_ID);
    scannerRef.current = html5Qrcode;
    try {
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', message: 'Tidak bisa mengakses kamera. Cek izin kamera.' });
    }
  }, [handleScanSuccess, showToast]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSchedule = async (newSchedule: PrayerScheduleItem[]) => {
    setSavingSchedule(true);
    try {
      await StorageService.savePrayerSchedule(newSchedule);
      setSchedule(newSchedule);
      setShowSettings(false);
    } catch (err) {
      alert('Gagal menyimpan jadwal. Pastikan tabel prayer_schedule sudah dibuat (lihat supabase/migration-2-jadwal-otomatis.sql).');
      console.error(err);
    }
    setSavingSchedule(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <QrCode size={24} className="text-emerald-600" /> Scanner Presensi
          </h1>
          <p className="text-gray-500 text-sm">Arahkan kamera ke QR/barcode siswa.</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          title="Atur jadwal otomatis"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Toggle mode */}
      <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 grid grid-cols-2 gap-1">
        <button
          onClick={() => setMode('otomatis')}
          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'otomatis' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Otomatis (jam)
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'manual' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Manual (pilih sendiri)
        </button>
      </div>

      {/* Status ibadah yang akan dicatat */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        {mode === 'otomatis' ? (
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400 shrink-0" />
            {autoPrayer && (
              <p className="text-sm text-gray-700">
                Terdeteksi otomatis: <span className="font-bold text-emerald-700">{autoPrayer}</span>
              </p>
            )}
            {isAmbiguous && (
              <p className="text-sm text-amber-700">
                Ada {activePrayers.length} jadwal di jam ini ({activePrayers.map(p => p.prayer).join(' / ')}).
                Silakan pindah ke mode <b>Manual</b> untuk memilih salah satu.
              </p>
            )}
            {noScheduleMatch && (
              <p className="text-sm text-gray-500">
                Tidak ada jadwal ibadah aktif jam ini. Gunakan mode <b>Manual</b>, atau atur jadwal lewat ikon ⚙.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Jenis Ibadah</label>
            <div className="grid grid-cols-4 gap-2">
              {PRAYER_TYPES.map(p => (
                <button
                  key={p}
                  onClick={() => setManualPrayer(p)}
                  className={`text-xs sm:text-sm py-2 rounded-lg font-medium transition-colors ${
                    manualPrayer === p ? 'bg-emerald-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div id={READER_ID} className="w-full aspect-square bg-gray-900 rounded-xl overflow-hidden" />

        <div className="mt-4">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              <Camera size={18} /> Mulai Scan
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg transition-colors"
            >
              Hentikan Scan
            </button>
          )}
        </div>
      </div>

      {processing && <p className="text-center text-sm text-gray-400">Memproses...</p>}

      {/* POP-UP NOTIFIKASI SEKILAS */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm animate-in fade-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${
              toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'duplicate' ? 'bg-amber-500' : 'bg-red-600'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <XCircle size={20} className="shrink-0" />}
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      {showSettings && (
        <ScheduleSettingsModal
          schedule={schedule}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSchedule}
          saving={savingSchedule}
        />
      )}
    </div>
  );
};

// ---------- Modal pengaturan jadwal otomatis ----------
const ScheduleSettingsModal: React.FC<{
  schedule: PrayerScheduleItem[];
  onClose: () => void;
  onSave: (s: PrayerScheduleItem[]) => void;
  saving: boolean;
}> = ({ schedule, onClose, onSave, saving }) => {
  const initial = PRAYER_TYPES.map(p => schedule.find(s => s.prayer === p) ?? { prayer: p, startTime: '', endTime: '' });
  const [draft, setDraft] = useState<PrayerScheduleItem[]>(initial);

  const updateField = (prayer: PrayerType, field: 'startTime' | 'endTime', value: string) => {
    setDraft(prev => prev.map(d => (d.prayer === prayer ? { ...d, [field]: value } : d)));
  };

  const handleSubmit = () => {
    const valid = draft.filter(d => d.startTime && d.endTime);
    onSave(valid);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Atur Jadwal Otomatis</h2>
        <p className="text-xs text-gray-400 mb-4">
          Kosongkan jam kalau ibadah tersebut tidak dipakai mode otomatis. Boleh ada jadwal yang jamnya sama
          (misal Dhuha & Upacara) — sistem akan minta pindah ke mode Manual saat itu terjadi.
        </p>
        <div className="space-y-3">
          {draft.map(d => (
            <div key={d.prayer} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">{d.prayer}</span>
              <input
                type="time"
                value={d.startTime}
                onChange={e => updateField(d.prayer, 'startTime', e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="time"
                value={d.endTime}
                onChange={e => updateField(d.prayer, 'endTime', e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg mt-5 disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Simpan Jadwal
        </button>
      </div>
    </div>
  );
};
