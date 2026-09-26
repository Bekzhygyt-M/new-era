import { db } from '@/lib/db';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Award,
  Calendar,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const profiles = await db.getProfiles();
  const courses = await db.getCourses();
  const payments = await db.getPayments();
  const stats = await db.getStats();

  const totalUsers = profiles.length;
  const beginnerCount = profiles.filter((p) => p.level === 'Beginner').length;
  const proCount = profiles.filter((p) => p.level === 'Pro').length;

  const approvedPayments = payments.filter((p) => p.status === 'approved');
  const pendingReceipts = payments.filter((p) => p.status === 'receipt_submitted');
  const totalRevenue = stats.totalRevenue;
  const paidUsersCount = stats.paidUsersCount;
  const registeredOnlyCount = Math.max(0, totalUsers - paidUsersCount);

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

  const revenueMetrics = [
    { name: 'Kunlik Daromad', period: '24 soatlik', value: `${new Intl.NumberFormat('uz-UZ').format(dailyRevenue)} UZS`, badge: 'Kunlik' },
    { name: 'Haftalik Daromad', period: 'So‘nggi 7 kun', value: `${new Intl.NumberFormat('uz-UZ').format(weeklyRevenue)} UZS`, badge: 'Haftalik' },
    { name: 'Oylik Daromad', period: 'So‘nggi 30 kun', value: `${new Intl.NumberFormat('uz-UZ').format(monthlyRevenue)} UZS`, badge: 'Oylik' },
    { name: 'Yillik Daromad', period: 'So‘nggi 365 kun', value: `${new Intl.NumberFormat('uz-UZ').format(yearlyRevenue)} UZS`, badge: 'Yillik' },
  ];

  const kpis = [
    { name: 'Jami foydalanuvchilar', value: totalUsers, sub: `${paidUsersCount} ta xaridor`, icon: Users },
    { name: 'Jami tushum', value: `${new Intl.NumberFormat('uz-UZ').format(totalRevenue)} UZS`, sub: 'Tasdiqlangan to\'lovlar', icon: DollarSign },
    { name: 'Kvitansiyalar (Navbat)', value: pendingReceipts.length, sub: 'Tekshirish kutilmoqda', icon: Clock, alert: pendingReceipts.length > 0 },
    { name: 'Kurslar', value: `${courses.length} ta`, sub: 'Standard, PRO, VIP', icon: BookOpen },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
              COMMAND CENTER
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">NEW ERA Nazorat Markazi</h1>
          <p className="text-white/50 text-sm">Platforma ko&apos;rsatkichlari, tushumlar, talabalar va to&apos;lov tasdiqlash boshqaruvi.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/payments"
            className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xl flex items-center gap-1.5"
          >
            <ShieldCheck size={16} /> To&apos;lovlar ({pendingReceipts.length})
          </Link>
          <Link
            href="/admin/analytics"
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-1.5 transition"
          >
            <TrendingUp size={16} /> Chuqur Analitika
          </Link>
        </div>
      </div>

      {/* Pending Receipts Notification Banner */}
      {pendingReceipts.length > 0 && (
        <div className="bg-[#000000] border border-white/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center flex-shrink-0">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {pendingReceipts.length} ta yangi to&apos;lov kvitansiyasi tekshirish uchun kutmoqda!
              </h4>
              <p className="text-white/50 text-xs mt-0.5">
                Talabalar kurs ochilishini kutmoqda. Kvitansiyalarni tekshirib tasdiqlang.
              </p>
            </div>
          </div>
          <Link
            href="/admin/payments"
            className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 flex-shrink-0"
          >
            Navbatga o&apos;tish <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => (
          <div key={idx} className="bg-[#000000] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl hover:border-white/25 transition">
            {k.alert && (
              <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white animate-ping" />
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center">
                <k.icon size={20} />
              </div>
            </div>
            <div className="text-xs font-mono uppercase text-white/40 tracking-wider mb-1 font-bold">{k.name}</div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">{k.value}</div>
            <div className="text-[11px] text-white/40 font-mono mt-1 font-medium">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 4-Period Revenue Breakdown: Kunlik, Haftalik, Oylik, Yillik */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Wallet size={18} className="text-white" />
              Moliya va Daromad Tahlili (Kunlik, Haftalik, Oylik, Yillik)
            </h2>
            <p className="text-xs text-white/50 mt-0.5">Tasdiqlangan to&apos;lovlar bo&apos;yicha aniq daromad ko&apos;rsatkichlari</p>
          </div>
          <Link
            href="/admin/analytics"
            className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1 transition"
          >
            Batafsil analitika <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueMetrics.map((r, idx) => (
            <div
              key={idx}
              className="bg-[#000000] border border-white/15 rounded-3xl p-6 shadow-2xl hover:border-white/35 transition relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  {r.badge}
                </span>
                <Calendar size={16} className="text-white/40 group-hover:text-white transition" />
              </div>
              <div className="text-xs font-mono uppercase text-white/50 tracking-wider mb-1 font-bold">
                {r.name}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {r.value}
              </div>
              <div className="text-[11px] text-white/40 font-mono mt-1.5 flex items-center gap-1">
                <span>{r.period}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary User Conversion Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#000000] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div>
          <span className="text-[10px] font-mono uppercase text-white/40 block mb-1 font-bold">Sotib olganlar</span>
          <span className="text-2xl font-black font-mono text-white">{paidUsersCount}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-white/40 block mb-1 font-bold">Faqat ro&apos;yxatdan o&apos;tgan</span>
          <span className="text-2xl font-black font-mono text-white/60">{registeredOnlyCount}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-white/40 block mb-1 font-bold">Beginner talabalar</span>
          <span className="text-2xl font-black font-mono text-white">{beginnerCount}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-white/40 block mb-1 font-bold">PRO talabalar</span>
          <span className="text-2xl font-black font-mono text-white">{proCount}</span>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments Queue */}
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <CreditCard size={18} className="text-white" />
              So&apos;nggi to&apos;lovlar
            </h2>
            <Link href="/admin/payments" className="text-xs font-bold text-white/70 hover:text-white hover:underline">
              Barchasini ko&apos;rish →
            </Link>
          </div>

          <div className="space-y-3">
            {payments?.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white text-sm">
                    {p.first_name || p.profiles?.full_name || 'Noma\'lum'}
                  </div>
                  <span className="text-white/40 font-mono">{p.order_id || p.id.slice(0, 8)} • {p.courses?.title}</span>
                </div>
                <div className="text-right">
                  <div className="font-black font-mono text-white text-sm">
                    {new Intl.NumberFormat('uz-UZ').format(p.amount)} {p.currency}
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded mt-0.5 inline-block">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center py-6 text-white/40 text-xs font-mono">To&apos;lovlar mavjud emas.</div>
            )}
          </div>
        </div>

        {/* Latest Test Submissions */}
        <div className="bg-[#000000] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Award size={18} className="text-white" />
              So&apos;nggi test natijalari
            </h2>
            <Link href="/admin/tests" className="text-xs font-bold text-white/70 hover:text-white hover:underline">
              Testlar bo&apos;limi →
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { id: '1', name: 'Alisher Usmonov', test: 'Smart Money Concepts Testi', score: 92, passed: true },
              { id: '2', name: 'Sardor Rahimov', test: 'Order Block & Liquidity Testi', score: 88, passed: true },
              { id: '3', name: 'Jasur Karimov', test: 'Trading Asoslari & Risk Testi', score: 95, passed: true }
            ].map((t) => (
              <div
                key={t.id}
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <span className="text-white/40">{t.test}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-base font-black text-white block">
                    {t.score}%
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${t.passed ? 'text-white/80' : 'text-rose-400'}`}>
                    {t.passed ? 'O\'tdi (90%+)' : 'Yiqildi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
