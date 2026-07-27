-- =========================================================
-- MIGRASI TAMBAHAN: Jadwal otomatis untuk Scanner
-- Jalankan ini di Supabase Dashboard > SQL Editor > New query
-- (project yang sudah pernah menjalankan schema.sql sebelumnya)
-- =========================================================

create table if not exists prayer_schedule (
  prayer text primary key,
  start_time time not null,
  end_time time not null
);

alter table prayer_schedule enable row level security;

create policy "Authenticated users can read schedule"
  on prayer_schedule for select
  to authenticated
  using (true);

create policy "Authenticated users can upsert schedule"
  on prayer_schedule for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update schedule"
  on prayer_schedule for update
  to authenticated
  using (true);

-- Jadwal contoh (SESUAIKAN dengan jam sekolahmu lewat menu "Atur Jadwal" di aplikasi)
-- Catatan: Dhuha & Upacara sengaja jam-nya sama -> ini kasus yang HARUS pakai mode Manual,
-- karena sistem tidak bisa menebak otomatis Senin itu Upacara atau Dhuha.
insert into prayer_schedule (prayer, start_time, end_time) values
  ('Subuh', '04:30', '05:45'),
  ('Dhuha', '06:30', '07:30'),
  ('Upacara', '06:30', '07:30'),
  ('Dzuhur', '12:00', '12:45'),
  ('Ashar', '15:00', '15:45'),
  ('Maghrib', '18:00', '18:30'),
  ('Isya', '19:00', '19:45'),
  ('Jumat', '11:30', '13:00')
on conflict (prayer) do nothing;
