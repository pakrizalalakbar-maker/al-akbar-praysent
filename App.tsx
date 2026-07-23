import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { ViewState, Student, AttendanceRecord } from './types';
import { StorageService } from './services/storage';
import { GeminiService } from './services/geminiService';
import { supabase } from './lib/supabaseClient';
import { Login } from './components/Login';
import { Scanner } from './components/Scanner';
import { StudentDatabase } from './components/StudentDatabase';
import { Reports } from './components/Reports';
import { TeacherReports } from './components/TeacherReports';
import { Help } from './components/Help';
import { QrCode, ClipboardList, Users, HelpCircle, LayoutDashboard, Sparkles, UserCheck, LogOut, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  // Pantau status login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Muat data begitu sudah login
  useEffect(() => {
    if (!session) return;
    let active = true;
    setDataLoading(true);
    Promise.all([StorageService.getStudents(), StorageService.getRecords()])
      .then(([s, r]) => {
        if (!active) return;
        setStudents(s);
        setRecords(r);
      })
      .catch(err => console.error('Gagal memuat data:', err))
      .finally(() => active && setDataLoading(false));
    return () => {
      active = false;
    };
  }, [session]);

  const handleRecordAdded = useCallback((newRecord: AttendanceRecord) => {
    setRecords(prev => [newRecord, ...prev]);
  }, []);

  const generateInsight = async () => {
    setLoadingAi(true);
    const result = await GeminiService.analyzeAttendance(records, students);
    setAiInsight(result);
    setLoadingAi(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView(ViewState.DASHBOARD);
    setAiInsight('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.dateStr === today);
  const prayerStats = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map(p => ({
    name: p,
    count: todayRecords.filter(r => r.prayer === p).length
  }));

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
      );
    }
    switch (view) {
      case ViewState.SCANNER:
        return <Scanner students={students} onRecordAdded={handleRecordAdded} />;
      case ViewState.STUDENTS:
        return <StudentDatabase students={students} setStudents={setStudents} />;
      case ViewState.REPORTS:
        return <Reports records={records} />;
      case ViewState.TEACHER_REPORTS:
        return <TeacherReports records={records} />;
      case ViewState.HELP:
        return <Help />;
      case ViewState.DASHBOARD:
      default:
        return (
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            <header className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Assalamu'alaikum, {session.user.email}.</h1>
                <p className="text-gray-500">Ringkasan aktivitas presensi hari ini.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Anggota</p>
                    <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Hadir Hari Ini</p>
                    <p className="text-2xl font-bold text-gray-900">{todayRecords.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                    <Sparkles size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Analisis AI</p>
                    <button
                      onClick={generateInsight}
                      disabled={loadingAi}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800 mt-1 disabled:opacity-50 flex items-center gap-1"
                    >
                      {loadingAi ? 'Sedang Menganalisis...' : 'Buat Laporan Harian'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {aiInsight && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-4">
                <h3 className="flex items-center gap-2 font-bold text-purple-900 mb-2">
                  <Sparkles size={16} /> Insight Asisten Cerdas
                </h3>
                <div className="prose prose-sm max-w-none text-purple-900 whitespace-pre-line">
                  {aiInsight}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Grafik Kehadiran Hari Ini</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prayerStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      <nav className="bg-white w-full md:w-20 lg:w-64 md:h-screen shadow-sm border-r border-gray-200 flex flex-row md:flex-col justify-between z-20 sticky top-0 md:fixed">
        <div className="p-4 flex items-center justify-between md:justify-center">
          <div className="flex items-center gap-2 md:flex-col">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">
              A
            </div>
            <span className="font-bold text-gray-800 md:hidden lg:block">Al-Akbar Praysent</span>
          </div>
        </div>

        <div className="flex md:flex-col flex-1 justify-around md:justify-start gap-2 p-2 overflow-x-auto md:overflow-visible">
          <NavButton
            active={view === ViewState.DASHBOARD}
            onClick={() => setView(ViewState.DASHBOARD)}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <NavButton
            active={view === ViewState.SCANNER}
            onClick={() => setView(ViewState.SCANNER)}
            icon={<QrCode size={20} />}
            label="Scanner"
          />
          <NavButton
            active={view === ViewState.STUDENTS}
            onClick={() => setView(ViewState.STUDENTS)}
            icon={<Users size={20} />}
            label="Database"
          />
          <NavButton
            active={view === ViewState.REPORTS}
            onClick={() => setView(ViewState.REPORTS)}
            icon={<ClipboardList size={20} />}
            label="Laporan Siswa"
          />
          <NavButton
            active={view === ViewState.TEACHER_REPORTS}
            onClick={() => setView(ViewState.TEACHER_REPORTS)}
            icon={<UserCheck size={20} />}
            label="Laporan Guru"
          />
        </div>

        <div className="hidden md:block p-2 space-y-1">
          <NavButton
            active={view === ViewState.HELP}
            onClick={() => setView(ViewState.HELP)}
            icon={<HelpCircle size={20} />}
            label="Bantuan APK"
          />
          <NavButton active={false} onClick={handleLogout} icon={<LogOut size={20} />} label="Keluar" />
        </div>
      </nav>

      <main className="flex-1 md:ml-20 lg:ml-64 transition-all duration-300">
        {renderContent()}
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full
      ${active
        ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }
    `}
  >
    <div className={active ? 'text-emerald-600' : ''}>{icon}</div>
    <span className="hidden lg:block text-sm">{label}</span>
  </button>
);

export default App;
