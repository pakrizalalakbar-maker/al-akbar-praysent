// Supabase Edge Function: gemini-insight
// Tujuan: menyimpan GEMINI_API_KEY di server (bukan di browser) dan
// meneruskan permintaan analisis kehadiran ke Gemini API.
//
// Deploy dengan:
//   supabase functions deploy gemini-insight
// Lalu set secret:
//   supabase secrets set GEMINI_API_KEY=your_actual_key_here

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY belum diset sebagai secret di Supabase.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { records, students } = await req.json();

    const today = new Date().toISOString().split('T')[0];
    const todayRecords = (records ?? []).filter((r: any) => r.dateStr === today);

    const prompt = `Kamu adalah asisten analisis data presensi ibadah sekolah.
Berikut ringkasan data hari ini (${today}):
- Total siswa terdaftar: ${students?.length ?? 0}
- Total presensi hari ini: ${todayRecords.length}
- Rincian per jenis ibadah: ${JSON.stringify(
      todayRecords.reduce((acc: Record<string, number>, r: any) => {
        acc[r.prayer] = (acc[r.prayer] ?? 0) + 1;
        return acc;
      }, {})
    )}

Buat ringkasan singkat (maksimal 4 kalimat, bahasa Indonesia, nada positif dan membangun)
tentang tingkat kehadiran hari ini, dan satu saran praktis untuk meningkatkan kehadiran jika diperlukan.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const insight =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Tidak ada insight yang bisa dibuat saat ini.';

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
