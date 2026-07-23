import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Catatan keamanan: GEMINI_API_KEY TIDAK lagi dimasukkan ke bundle frontend.
// Key itu sekarang hanya hidup sebagai secret di Supabase Edge Function
// (supabase/functions/gemini-insight), sehingga tidak bisa dilihat lewat
// DevTools browser oleh siapapun yang membuka web ini.
//
// VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY memang boleh publik (anon key
// dirancang untuk dipakai di frontend, akses datanya tetap dibatasi oleh
// Row Level Security di database).

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
