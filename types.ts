export interface Student {
  id: string; // NIS atau ID unik (GR untuk Guru)
  name: string;
  class: string;
  gender: 'L' | 'P';
}

export type PrayerType = 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya' | 'Dhuha' | 'Jumat' | 'Upacara';

export const PRAYER_TYPES: PrayerType[] = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya', 'Dhuha', 'Jumat', 'Upacara'];

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  timestamp: number; // Unix timestamp
  dateStr: string; // YYYY-MM-DD
  prayer: PrayerType;
  isLate?: boolean;
}

export interface AppState {
  students: Student[];
  records: AttendanceRecord[];
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SCANNER = 'SCANNER',
  STUDENTS = 'STUDENTS',
  REPORTS = 'REPORTS',
  TEACHER_REPORTS = 'TEACHER_REPORTS',
  HELP = 'HELP'
}

// Profil admin/guru yang login (disimpan di tabel `profiles` di Supabase)
export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'guru';
}

// Jadwal jam ibadah untuk mode deteksi otomatis di Scanner
export interface PrayerScheduleItem {
  prayer: PrayerType;
  startTime: string; // format "HH:mm"
  endTime: string;   // format "HH:mm"
}
