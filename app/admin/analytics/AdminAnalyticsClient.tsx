'use client';

import { useMemo } from 'react';
import type { LocalProfile, LocalPayment, LocalLessonProgress, LocalTestAttempt } from '@/types/admin';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  PlayCircle, 
  Award, 
  Percent,
  CheckCircle2,
  Calendar,
  Wallet
} from 'lucide-react';

interface AdminAnalyticsClientProps {
  profiles: LocalProfile[];
  payments: LocalPayment[];
  progress: LocalLessonProgress[];
  testAttempts: LocalTestAttempt[];
}

export default function AdminAnalyticsClient({
  profiles,
  payments,
  progress,
  testAttempts,
}: AdminAnalyticsClientProps) {
  // Aggregate revenue by date (last 7 days)
  const revenueChartData = useMemo(() => {
    const map: Record<string, number> = {};
    const dates = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    dates.forEach((date) => {
      map[date] = 0;
    });

    payments
      .filter((p) => p.status === 'approved')
      .forEach((p) => {
        const date = p.created_at.slice(0, 10);
        if (map[date] !== undefined) {
          map[date] += p.amount;
        }
      });

    return dates.map((date) => ({
      date: date.slice(5),
      revenue: map[date],
    }));
  }, [payments]);

  // Aggregate user registrations by date
  const registrationChartData = useMemo(() => {
    const map: Record<string, number> = {};
    const dates = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    dates.forEach((date) => {
      map[date] = 0;
    });

    profiles.forEach((p) => {
      const date = p.created_at.slice(0, 10);
      if (map[date] !== undefined) {
        map[date] += 1;
      }
    });

    return dates.map((date) => ({
      date: date.slice(5),
      users: map[date],
    }));
  }, [profiles]);

  // Level breakdown distribution
  const levelDistribution = useMemo(() => {
    const counts: Record<string, number> = { Beginner: 0, Intermediate: 0, Advanced: 0, Pro: 0 };
    profiles.forEach((p) => {
      const lvl = p.level || 'Beginner';
      counts[lvl] = (counts[lvl] || 0) + 1;
    });

    return [
      { name: 'Beginner', value: counts['Beginner'], color: '#ffffff' },
      { name: 'Pro', value: counts['Pro'], color: '#888888' },
      { name: 'VIP', value: counts['Advanced'] + counts['Intermediate'], color: '#444444' },
    ];
  }, [profiles]);

  // KPIs
  const totalUsers = profiles.length;
  const approvedPayments = payments.filter((p) => p.status === 'approved');
  const paidUsersCount = new Set(approvedPayments.map((p) => p.user_id)).size;
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalTestAttempts = testAttempts.length;
  const passedTests = testAttempts.filter((t) => t.passed).length;
  const averageTestScore = totalTestAttempts > 0
    ? Math.round(testAttempts.reduce((sum, t) => sum + t.score, 0) / totalTestAttempts)
    : 0;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  const oneMonthMs = 30 * oneDayMs;
  const oneYearMs = 365 * oneDayMs;

  const dailyRevenue = approvedPayments
    .filter((p) => now - new Date(p.created_at).getTime() <= oneDayMs)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const weeklyRevenue = approvedPayments
    .filter((p) => now - new Date(p.created_at).getTime() <= oneWeekMs)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const monthlyRevenue = approvedPayments
    .filter((p) => now - new Date(p.created_at).getTime() <= oneMonthMs)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const yearlyRevenue = approvedPayments
    .filter((p) => now - new Date(p.created_at).getTime() <= oneYearMs)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const periodRevenueMetrics = [
    { name: 'Kunlik Daromad', period: '24 soatlik', value: `${new Intl.NumberFormat('uz-UZ').format(dailyRevenue)} UZS`, badge: 'Kunlik' },
    { name: 'Haftalik Daromad', period: 'So‘nggi 7 kun', value: `${new Intl.NumberFormat('uz-UZ').format(weeklyRevenue)} UZS`, badge: 'Haftalik' },
    { name: 'Oylik Daromad', period: 'So‘nggi 30 kun', value: `${new Intl.NumberFormat('uz-UZ').format(monthlyRevenue)} UZS`, badge: 'Oylik' },
    { name: 'Yillik Daromad', period: 'So‘nggi 365 kun', value: `${new Intl.NumberFormat('uz-UZ').format(yearlyRevenue)} UZS`, badge: 'Yillik' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-3xl font-black text-white tracking-tight">Platforma Chuqur Analitikasi</h1>
        <p className="text-white/50 text-sm">Daromad oqimi, konversiya, talabalar faolligi va test ko&apos;rsatkichlari.</p>
      </div>

      {/* 4-Period Revenue Breakdown */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Wallet size={18} className="text-white" />
            Daromad Tahlili (Kunlik / Haftalik / Oylik / Yillik)
          </h2>
          <p className="text-xs text-white/50 mt-0.5">Tasdiqlangan to&apos;lovlar bo&apos;yicha aniq davriy daromad</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {periodRevenueMetrics.map((r, idx) => (
            <div
              key={idx}
              className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl hover:border-white/35 transition relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  {r.badge}
                </span>
                <Calendar size={16} className="text-white/40" />
              </div>
              <div className="text-xs font-mono uppercase text-white/50 tracking-wider mb-1 font-bold">
                {r.name}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {r.value}
              </div>
              <div className="text-[11px] text-white/40 font-mono mt-1.5">
                {r.period}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Jami daromad</span>
            <DollarSign size={18} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {new Intl.NumberFormat('uz-UZ').format(totalRevenue)} UZS
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Tasdiqlangan buyurtmalar</span>
        </div>

        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Foydalanuvchilar</span>
            <Users size={18} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{totalUsers}</div>
          <span className="text-[11px] text-white/40 mt-1 block">{paidUsersCount} ta sotib olgan talaba</span>
        </div>

        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">Test o&apos;tish koeffitsiyenti</span>
            <Percent size={18} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {totalTestAttempts > 0 ? Math.round((passedTests / totalTestAttempts) * 100) : 0}%
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">{passedTests} / {totalTestAttempts} ta o&apos;tgan</span>
        </div>

        <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 font-mono">O&apos;rtacha test bali</span>
            <Award size={18} className="text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{averageTestScore}%</div>
          <span className="text-[11px] text-white/40 mt-1 block">Min talab: 90%</span>
        </div>
      </div>

      {/* Recharts Graphs: Revenue & Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">So&apos;nggi 7 kunlik tushum</h3>
              <p className="text-xs text-white/40">Kunlik tasdiqlangan to&apos;lovlar grafigi</p>
            </div>
            <TrendingUp size={20} className="text-white" />
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Registrations Chart */}
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Yangi a&apos;zolar dinamikasi</h3>
              <p className="text-xs text-white/40">Kunlik ro&apos;yxatdan o&apos;tishlar</p>
            </div>
            <Users size={20} className="text-white" />
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={registrationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="users" fill="#ffffff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
