import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import {
  BookOpen,
  PlayCircle,
  Trophy,
  Target,
  ClipboardList,
  LineChart,
  Bell,
  MessageSquare,
  Settings,
  Award,
  ArrowRight,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getOverallProgress, getCourseStatus } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/** Student dashboard. Shows exact 30-day course limit, remaining days countdown, and learning progress. */
export default async function DashboardPage() {
  const auth = await requireUserPage('/dashboard');
  const { t } = await getTranslations();
  const { profile } = auth;

  const settings = await db.getSettings();
  const overall = await getOverallProgress(profile.id);
  const enrollments = await db.getEnrollments(profile.id);
  const notifications = await db.getNotifications(profile.id);
  const unread = notifications.filter((n) => n.read === false).length;
  const certificates = (await db.getCertificates(profile.id)).filter((c) => !c.revoked);
  const journalCount = (await db.getJournal(profile.id)).length;
  const backtestCount = (await db.getBacktests(profile.id)).length;
  const attempts = await db.getAttempts(profile.id);

  // Next level threshold for the XP bar.
  const thresholds = [...settings.level_thresholds].sort((a, b) => a.xp - b.xp);
  const nextThreshold = thresholds.find((t) => t.xp > profile.xp);
  const currentThreshold = [...thresholds].reverse().find((t) => profile.xp >= t.xp) || thresholds[0];
  const levelProgress = nextThreshold
    ? Math.round(
        ((profile.xp - currentThreshold.xp) / (nextThreshold.xp - currentThreshold.xp)) * 100
      )
    : 100;

  // 30-day course limit calculation
  const now = Date.now();
  const courseLimits = overall.courses.map((course, idx) => {
    const status = overall.statuses[idx];
    const enrollment = enrollments.find((e) => e.course_id === course.id);

    const expiresAtMs = enrollment?.expires_at
      ? new Date(enrollment.expires_at).getTime()
      : enrollment?.purchased_at
        ? new Date(enrollment.purchased_at).getTime() + (settings.course_limit_days || 30) * 24 * 60 * 60 * 1000
        : 0;

    const purchasedAtMs = enrollment?.purchased_at
      ? new Date(enrollment.purchased_at).getTime()
      : 0;

    const isExpired = expiresAtMs > 0 && expiresAtMs <= now;
    const remainingMs = Math.max(0, expiresAtMs - now);
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    const totalLimitDays = settings.course_limit_days || 30;
    const elapsedDays = purchasedAtMs > 0 ? Math.min(totalLimitDays, Math.max(0, Math.floor((now - purchasedAtMs) / (24 * 60 * 60 * 1000)))) : 0;
    const daysPercent = Math.min(100, Math.max(0, Math.round(((totalLimitDays - remainingDays) / totalLimitDays) * 100)));

    return {
      course,
      status,
      enrollment,
      expiresAtMs,
      purchasedAtMs,
      remainingDays,
      isExpired,
      totalLimitDays,
      elapsedDays,
      daysPercent,
    };
  });

  // Most relevant active course for top limit banner
  const primaryCourseLimit = courseLimits.find((c) => !c.isExpired) || courseLimits[0];
  const activeRemainingDays = primaryCourseLimit ? primaryCourseLimit.remainingDays : 30;

  const kpis = [
    { label: t('dashboard.overallProgress'), value: `${overall.percentage}%`, icon: Target, accent: 'text-white' },
    { label: t('dashboard.completedLessons'), value: `${overall.completedLessons}/${overall.totalLessons}`, icon: BookOpen, accent: 'text-white' },
    {
      label: t('dashboard.avgScore'),
      value: overall.averageTestScore ? `${overall.averageTestScore}%` : '—',
      icon: Trophy,
      accent: 'text-emerald-400',
    },
    { 
      label: 'Qolgan kunlar', 
      value: primaryCourseLimit ? (primaryCourseLimit.isExpired ? '0 kun' : `${primaryCourseLimit.remainingDays} kun`) : '30 kun', 
      icon: Clock,
      accent: primaryCourseLimit?.isExpired ? 'text-rose-400' : 'text-pink-400',
      badge: primaryCourseLimit?.isExpired ? 'Tugagan' : 'Limit',
    },
  ];

  const quickLinks = [
    { href: '/courses/my', label: t('dashboard.myLessons'), icon: BookOpen },
    { href: '/journal', label: 'Trading Journal', icon: ClipboardList, badge: journalCount || undefined },
    { href: '/backtest', label: 'Backtest', icon: LineChart, badge: backtestCount || undefined },
    { href: '/statistics', label: t('dashboard.statisticsLink'), icon: Target },
    { href: '/notifications', label: t('dashboard.notificationsLink'), icon: Bell, badge: unread || undefined },
    { href: '/messages', label: t('dashboard.messagesLink'), icon: MessageSquare },
    { href: '/settings', label: t('dashboard.settingsLink'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-24 sm:px-8">
        {/* Greeting & Profile Header */}
        <header className="mb-7 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.03] via-pink-500/[0.04] to-emerald-500/[0.03] p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-pink-400">
                {t('dashboard.welcome')}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl text-white">
                {profile.full_name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-[11px] font-bold text-pink-300 font-mono">
                  {profile.level}
                </span>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[11px] font-bold text-white/70">
                  {profile.xp} XP
                </span>
                {auth.isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300 font-mono flex items-center gap-1"
                  >
                    <ShieldCheck size={12} /> {t('dashboard.adminPanelLink')}
                  </Link>
                )}
              </div>
            </div>

            {/* XP progress */}
            <div className="w-full md:w-72 bg-black/40 p-4 rounded-2xl border border-white/10">
              <div className="mb-2 flex justify-between text-[11px] font-bold">
                <span className="text-white/60">{currentThreshold.name}</span>
                <span className="font-mono text-pink-400">
                  {nextThreshold ? `${profile.xp} / ${nextThreshold.xp} XP` : 'Maksimal'}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={levelProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-500" 
                  style={{ width: `${levelProgress}%` }} 
                />
              </div>
            </div>
          </div>
        </header>

        {/* 30-Day Limit Hero Banner (Visible when user has courses) */}
        {primaryCourseLimit && (
          <section className={`mb-7 rounded-3xl p-6 sm:p-7 border relative overflow-hidden transition-all ${
            primaryCourseLimit.isExpired 
              ? 'border-rose-500/30 bg-rose-950/20 shadow-[0_0_40px_-15px_rgba(244,63,94,0.25)]' 
              : 'border-pink-500/30 bg-gradient-to-r from-pink-950/20 via-[#0a0a0a] to-emerald-950/20 shadow-[0_0_40px_-15px_rgba(236,72,153,0.2)]'
          }`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-bold uppercase tracking-wider ${
                    primaryCourseLimit.isExpired
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${primaryCourseLimit.isExpired ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                    {primaryCourseLimit.isExpired ? 'Muddati tugagan' : 'Faol darslar limiti (30 kun)'}
                  </span>
                  <span className="text-white/40 text-xs font-mono">
                    {primaryCourseLimit.course.title}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {primaryCourseLimit.isExpired ? (
                    '30 kunlik kirish muddati yakunlandi'
                  ) : (
                    <span>
                      Darslarga kirish uchun <span className="text-pink-400 font-mono underline underline-offset-4">{primaryCourseLimit.remainingDays} kun</span> qoldi
                    </span>
                  )}
                </h2>

                <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                  {primaryCourseLimit.isExpired ? (
                    'Darslardan foydalanishning 30 kunlik muddati to‘liq yakunlandi va darslar avtomatik yopildi. Bilimlaringizni davom ettirish uchun tarifni qayta faollashtiring.'
                  ) : (
                    'Siz tanlagan kurs uchun 30 kunlik dars davomiyligi belgilangan. 30 kundan so‘ng kurs avtomatik yopiladi. Vaqtdan unumli foydalanib barcha dars va testlarni o‘z vaqtida yakunlang.'
                  )}
                </p>

                {/* Date badges */}
                <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-[11px] text-white/50">
                  {primaryCourseLimit.purchasedAtMs > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-white/40" />
                      Boshlangan: {new Date(primaryCourseLimit.purchasedAtMs).toLocaleDateString('uz-UZ')}
                    </span>
                  )}
                  {primaryCourseLimit.expiresAtMs > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className={primaryCourseLimit.isExpired ? 'text-rose-400' : 'text-pink-400'} />
                      Tugash sanasi: {new Date(primaryCourseLimit.expiresAtMs).toLocaleDateString('uz-UZ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Countdown badge & Action */}
              <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-center gap-4">
                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:px-6 text-center w-full sm:w-auto">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1">
                    Qolgan kunlar
                  </div>
                  <div className={`font-mono text-3xl sm:text-4xl font-black ${
                    primaryCourseLimit.isExpired ? 'text-rose-400' : 'text-pink-400'
                  }`}>
                    {primaryCourseLimit.isExpired ? '0' : primaryCourseLimit.remainingDays}
                    <span className="text-sm text-white/50 ml-1">/ 30 kun</span>
                  </div>
                </div>

                {primaryCourseLimit.isExpired ? (
                  <Link
                    href={`/checkout/${primaryCourseLimit.course.id}`}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 font-mono"
                  >
                    <RefreshCw size={14} />
                    <span>Qayta faollashtirish</span>
                  </Link>
                ) : (
                  <Link
                    href={`/course/${primaryCourseLimit.course.id}`}
                    className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 font-mono"
                  >
                    <PlayCircle size={15} />
                    <span>Darslarga o‘tish</span>
                  </Link>
                )}
              </div>
            </div>

            {/* 30-day timeline bar */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex justify-between text-[10px] font-mono text-white/40 mb-1.5">
                <span>1-kun (Boshlanish)</span>
                <span>{primaryCourseLimit.isExpired ? '30 kun tugadi' : `${primaryCourseLimit.elapsedDays}/30 kun o‘tdi (${primaryCourseLimit.remainingDays} kun qoldi)`}</span>
                <span>30-kun (Yopilish)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    primaryCourseLimit.isExpired 
                      ? 'bg-rose-500' 
                      : 'bg-gradient-to-r from-emerald-500 via-pink-500 to-rose-500'
                  }`}
                  style={{ width: `${primaryCourseLimit.isExpired ? 100 : Math.min(100, Math.max(5, (primaryCourseLimit.elapsedDays / 30) * 100))}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Announcements & Notifications Feed */}
        {notifications.length > 0 && (
          <section className="mb-7 rounded-3xl border border-white/10 bg-[#090909] p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Bell size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                    Xabarnomalar & E&apos;lonlar
                  </h2>
                  <p className="text-[11px] text-white/40 font-mono">Platforma ma&apos;muriyatidan so&apos;nggi yangiliklar</p>
                </div>
              </div>
              <Link
                href="/notifications"
                className="text-xs font-mono font-bold text-pink-400 hover:text-pink-300 transition flex items-center gap-1"
              >
                <span>Barchasi ({notifications.length})</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {notifications.slice(0, 2).map((n) => (
                <Link
                  key={n.id}
                  href={n.link || '/notifications'}
                  className={`p-4 rounded-2xl border transition group flex flex-col justify-between ${
                    !n.read
                      ? 'bg-pink-950/15 border-pink-500/30 hover:border-pink-500/50'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-white group-hover:text-pink-300 transition">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0" />}
                        <span className="truncate">{n.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/40 shrink-0">
                        {new Date(n.created_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2 leading-relaxed font-sans">
                      {n.message}
                    </p>
                  </div>
                  {n.link && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1 text-[11px] font-mono font-bold text-white/50 group-hover:text-white transition">
                      <span>Batafsil ko&apos;rish</span>
                      <ArrowRight size={11} />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* KPIs */}
        <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-pink-500/30 transition">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon size={16} className="text-white/40" />
                {kpi.badge && (
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
                    {kpi.badge}
                  </span>
                )}
              </div>
              <div className={`font-mono text-xl sm:text-2xl font-black ${kpi.accent}`}>{kpi.value}</div>
              <div className="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-white/40">
                {kpi.label}
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Courses List */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-white/60">
                {t('dashboard.myPath')}
              </h2>
              <span className="text-[11px] font-mono text-pink-400">
                {courseLimits.length} ta kurs
              </span>
            </div>

            {courseLimits.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.01] px-6 py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/30">
                  <Lock size={24} />
                </div>
                <p className="mb-1 text-base font-bold text-white/80">{t('dashboard.noCourses')}</p>
                <p className="mb-6 text-xs text-white/40 max-w-md mx-auto">
                  {t('dashboard.pickTariff')}
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white transition shadow-lg shadow-pink-500/25 font-mono"
                >
                  {t('dashboard.viewCourses')} <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {courseLimits.map((item) => {
                  const { course, status, remainingDays, isExpired } = item;
                  const isPro = course.slug === 'pro' || course.title.toLowerCase().includes('pro');

                  return (
                    <article 
                      key={course.id} 
                      className={`rounded-3xl border p-6 sm:p-7 transition-all ${
                        isExpired 
                          ? 'border-rose-500/20 bg-rose-950/[0.05]' 
                          : isPro
                            ? 'border-pink-500/25 bg-gradient-to-b from-pink-950/10 to-transparent hover:border-pink-500/40'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              isPro 
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                                : 'bg-white/10 text-white border border-white/20'
                            }`}>
                              {isPro ? '🥈 PRO' : '🥉 STANDART'}
                            </span>

                            {/* Remaining days pill */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              isExpired 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              <Clock size={11} />
                              {isExpired ? '30 kun tugagan' : `Qolgan kunlar: ${remainingDays} kun`}
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl font-black text-white">{course.title}</h3>
                        </div>

                        <span className="shrink-0 font-mono text-sm font-bold text-white/70">
                          {status.percentage}%
                        </span>
                      </div>

                      {/* Course progress bar */}
                      <div
                        className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10"
                        role="progressbar"
                        aria-valuenow={status.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div 
                          className={`h-full rounded-full transition-all ${
                            status.completed ? 'bg-emerald-400' : 'bg-gradient-to-r from-pink-500 to-emerald-400'
                          }`} 
                          style={{ width: `${status.percentage}%` }} 
                        />
                      </div>

                      <p className="mb-5 text-[12px] text-white/50 font-mono">
                        {status.completedLessons} / {status.totalLessons} {t('dashboard.lessonsDone')}
                        {status.averageTestScore > 0 && ` · O‘rtacha test ${status.averageTestScore}%`}
                      </p>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2.5">
                        {isExpired ? (
                          <Link
                            href={`/checkout/${course.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-white transition hover:from-pink-600 hover:to-rose-600 shadow-md font-mono"
                          >
                            <RefreshCw size={13} /> Qayta faollashtirish (30 kun)
                          </Link>
                        ) : status.nextLessonId ? (
                          <Link
                            href={`/lesson/${status.nextLessonId}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-neutral-200 font-mono shadow-md"
                          >
                            <PlayCircle size={14} /> {t('dashboard.continueLearning')}
                          </Link>
                        ) : status.completed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-emerald-300 font-mono">
                            <Trophy size={14} /> Yakunlandi
                          </span>
                        ) : null}

                        {!isExpired && (
                          <Link
                            href={`/course/${course.id}`}
                            className="inline-flex items-center rounded-xl border border-white/15 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-white/70 transition hover:border-white/30 hover:text-white font-mono"
                          >
                            {t('dashboard.allLessons')}
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-wider text-white/50">
                {t('dashboard.quickLinks')}
              </h2>
              <nav className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                <ul className="divide-y divide-white/[0.05]">
                  {quickLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.04] hover:text-pink-300"
                      >
                        <link.icon size={15} className="shrink-0 text-white/40" />
                        <span className="flex-1 text-[13px] font-semibold text-white/80">{link.label}</span>
                        {link.badge !== undefined && (
                          <span className="rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 font-mono text-[10px] font-bold">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </section>

            {certificates.length > 0 && (
              <section>
                <h2 className="mb-3 text-[11px] font-black uppercase tracking-wider text-white/50">
                  Sertifikatlarim
                </h2>
                <ul className="space-y-2">
                  {certificates.map((certificate) => (
                    <li key={certificate.id}>
                      <Link
                        href={`/certificate/${certificate.certificate_id}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 transition hover:border-pink-500/30"
                      >
                        <Award size={15} className="shrink-0 text-amber-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-bold text-white">
                            {certificate.course_title}
                          </span>
                          <span className="block truncate font-mono text-[10.5px] text-white/35">
                            {certificate.certificate_id}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-wider text-white/50">
                {t('dashboard.recentNotifications')}
              </h2>

              {notifications.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-8 text-center text-[12.5px] text-white/35">
                  {t('dashboard.noNotifications')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {notifications.slice(0, 4).map((notification) => (
                    <li
                      key={notification.id}
                      className={`rounded-2xl border px-4 py-3.5 ${
                        notification.read ? 'border-white/[0.07] bg-white/[0.015]' : 'border-pink-500/25 bg-pink-500/[0.03]'
                      }`}
                    >
                      <p className="mb-1 text-[12.5px] font-bold text-white">{notification.title}</p>
                      <p className="line-clamp-2 text-[11.5px] leading-relaxed text-white/45">
                        {notification.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {attempts.length > 0 && (
              <p className="text-center text-[11px] font-mono text-white/25">
                Jami {attempts.length} ta test urinishi
              </p>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
