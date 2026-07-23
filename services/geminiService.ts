import { supabase } from '../lib/supabaseClient';
import { Student, AttendanceRecord } from '../types';

// PENTING (keamanan): Gemini API key TIDAK lagi disimpan/dipanggil dari
// browser. Permintaan analisis dikirim ke Supabase Edge Function
// "gemini-insight", yang menyimpan API key sebagai secret di server dan
// meneruskan permintaan ke Gemini dari sana. Lihat supabase/functions/gemini-insight.

export const GeminiService = {
  async analyzeAttendance(records: AttendanceRecord[], students: Student[]): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-insight', {
        body: { records, students },
      });
      if (error) throw error;
      return data?.insight ?? 'Tidak ada insight yang bisa dibuat saat ini.';
    } catch (err) {
      console.error('Gagal membuat analisis AI:', err);
      return 'Gagal membuat analisis AI. Pastikan fungsi "gemini-insight" sudah di-deploy dan GEMINI_API_KEY sudah diset sebagai secret di Supabase.';
    }
  },
};
