import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student, AttendanceRecord, PrayerType, PRAYER_TYPES } from '../types';
import { StorageService } from '../services/storage';
import { QrCode, CheckCircle2, XCircle, Camera } from 'lucide-react';

interface ScannerProps {
  students: Student[];
  onRecordAdded: (record: AttendanceRecord) => void;
}

type FeedbackState = { type: 'success' | 'error' | 'duplicate'; message: string } | null;

const READER_ID = 'reader';

export const Scanner: React.FC<ScannerProps> = ({ students, onRecordAdded }) => {
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerType>('Dzuhur');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // scanner mungkin sudah berhenti, aman diabaikan
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setProcessing(true);

      const studentId = decodedText.trim();
      const student = students.find(s => s.id === studentId);

      if (!student) {
        setFeedback({ type: 'error', message: `ID "${studentId}" tidak terdaftar di database siswa.` });
        setProcessing(false);
        processingRef.current = false;
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      try {
        const already = await StorageService.hasRecordToday(student.id, selectedPrayer, dateStr);
        if (already) {
          setFeedback({
            type: 'duplicate',
            message: `${student.name} sudah tercatat hadir ${selectedPrayer} hari ini.`,
          });
        } else {
          const newRecord = await StorageService.addRecord({
            studentId: student.id,
            studentName: student.name,
            studentClass: student.class,
            timestamp: now.getTime(),
            dateStr,
            prayer: selectedPrayer,
          });
          onRecordAdded(newRecord);
          setFeedback({ type: 'success', message: `${student.name} (${student.class}) tercatat hadir ${selectedPrayer}.` });
        }
      } catch (err) {
        console.error(err);
        setFeedback({ type: 'error', message: 'Gagal menyimpan data presensi. Cek koneksi internet.' });
      }

      setProcessing(false);
      // cegah scan beruntun dalam 2.5 detik untuk QR yang sama
      setTimeout(() => {
        processingRef.current = false;
      }, 2500);
    },
    [students, selectedPrayer, onRecordAdded]
  );

  const startScanner = useCallback(async () => {
    setFeedback(null);
    const html5Qrcode = new Html5Qrcode(READER_ID);
    scannerRef.current = html5Qrcode;
    try {
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        () => {
          /* ignore per-frame "not found" errors */
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.' });
    }
  }, [handleScanSuccess]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <QrCode size={24} className="text-emerald-600" /> Scanner Presensi
        </h1>
        <p className="text-gray-500 text-sm">Pilih jenis ibadah, lalu arahkan kamera ke QR/barcode siswa.</p>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Ibadah</label>
        <div className="grid grid-cols-4 gap-2">
          {PRAYER_TYPES.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPrayer(p)}
              className={`text-xs sm:text-sm py-2 rounded-lg font-medium transition-colors ${
                selectedPrayer === p
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
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

      {feedback && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'duplicate'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          ) : (
            <XCircle size={20} className="shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}
    </div>
  );
};
