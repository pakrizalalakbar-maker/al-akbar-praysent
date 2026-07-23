import { supabase } from '../lib/supabaseClient';
import { Student, AttendanceRecord, PrayerType } from '../types';

// StorageService: pengganti localStorage lama.
// Semua data sekarang disimpan di Supabase (Postgres) sehingga bisa
// diakses dan disinkronkan dari HP/perangkat manapun secara real-time.
//
// Struktur tabel yang dipakai (lihat supabase/schema.sql):
//   students(id text primary key, name text, class text, gender text)
//   attendance_records(id uuid primary key, student_id text, student_name text,
//                       student_class text, "timestamp" bigint, date_str text,
//                       prayer text, is_late boolean)

export const StorageService = {
  // ---------- STUDENTS ----------
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      class: row.class,
      gender: row.gender,
    }));
  },

  async addStudent(student: Student): Promise<void> {
    const { error } = await supabase.from('students').insert({
      id: student.id,
      name: student.name,
      class: student.class,
      gender: student.gender,
    });
    if (error) throw error;
  },

  async addStudentsBulk(students: Student[]): Promise<void> {
    if (students.length === 0) return;
    const { error } = await supabase.from('students').upsert(
      students.map(s => ({ id: s.id, name: s.name, class: s.class, gender: s.gender })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  },

  async updateStudent(student: Student): Promise<void> {
    const { error } = await supabase
      .from('students')
      .update({ name: student.name, class: student.class, gender: student.gender })
      .eq('id', student.id);
    if (error) throw error;
  },

  async deleteStudent(studentId: string): Promise<void> {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) throw error;
  },

  // ---------- ATTENDANCE RECORDS ----------
  async getRecords(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentClass: row.student_class,
      timestamp: Number(row.timestamp),
      dateStr: row.date_str,
      prayer: row.prayer as PrayerType,
      isLate: row.is_late ?? false,
    }));
  },

  // Cek apakah siswa sudah absen untuk sholat tertentu di tanggal tertentu
  // (mencegah scan dobel)
  async hasRecordToday(studentId: string, prayer: PrayerType, dateStr: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('prayer', prayer)
      .eq('date_str', dateStr)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async addRecord(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        student_id: record.studentId,
        student_name: record.studentName,
        student_class: record.studentClass,
        timestamp: record.timestamp,
        date_str: record.dateStr,
        prayer: record.prayer,
        is_late: record.isLate ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      studentId: data.student_id,
      studentName: data.student_name,
      studentClass: data.student_class,
      timestamp: Number(data.timestamp),
      dateStr: data.date_str,
      prayer: data.prayer,
      isLate: data.is_late,
    };
  },

  async deleteRecord(recordId: string): Promise<void> {
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (error) throw error;
  },
};
