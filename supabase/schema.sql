-- =========================================================
-- Al-Akbar Praysent - Skema Database Supabase
-- Jalankan seluruh isi file ini di: Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- Tabel siswa
create table if not exists students (
  id text primary key,
  name text not null,
  class text not null,
  gender text not null check (gender in ('L', 'P')),
  created_at timestamptz default now()
);

-- Tabel presensi
create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students(id) on delete cascade,
  student_name text not null,
  student_class text not null,
  "timestamp" bigint not null,
  date_str text not null,
  prayer text not null,
  is_late boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_records_date on attendance_records(date_str);
create index if not exists idx_records_student on attendance_records(student_id);

-- Aktifkan Row Level Security (RLS)
alter table students enable row level security;
alter table attendance_records enable row level security;

-- Hanya user yang SUDAH LOGIN (lewat Supabase Auth) yang boleh baca/tulis.
-- Ini yang membuat data aman dan butuh username+password untuk diakses.
create policy "Authenticated users can read students"
  on students for select
  to authenticated
  using (true);

create policy "Authenticated users can insert students"
  on students for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update students"
  on students for update
  to authenticated
  using (true);

create policy "Authenticated users can delete students"
  on students for delete
  to authenticated
  using (true);

create policy "Authenticated users can read records"
  on attendance_records for select
  to authenticated
  using (true);

create policy "Authenticated users can insert records"
  on attendance_records for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete records"
  on attendance_records for delete
  to authenticated
  using (true);
