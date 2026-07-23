import { createClient } from '@supabase/supabase-js';

// Ambil dari environment variable (diisi saat setup, lihat README.md)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. Cek file .env.local atau Environment Variables di Netlify.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
