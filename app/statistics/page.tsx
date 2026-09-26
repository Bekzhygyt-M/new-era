import { Flame } from 'lucide-react';
import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { requireUserPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getOverallProgress, getLearningStreak } from '@/lib/learning';
import { getTranslations } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * Personal analytics (TZ §10, §31).
 * Every figure is computed from the student's own stored rows.
 */
export default async function StatisticsPage() {
  const { t } = await getTranslations();
  const { profile } = await requireUserPage('/statistics');

  const [overall, streak, attempts, settings] = await Promise.all([
    getOverallProgress(profile.id),
    getLearningStreak(profile.id),
    db.getAttempts(profile.id),
    db.getSettings(),
  ]);

  const passedAttempts = attempts.filter((a) => a.passed);
  const averageScore = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;

  const cards = [
    {
      label: t('statistics.lessonsProgress'),
      value: `${overall.completedLessons} / ${overall.totalLessons}`,
      note: t('statistics.overallProgress', { n: overall.percentage }),
    },
    {
      label: t('statistics.avgScore'),
      value: attempts.length ? `${averageScore}%` : '—',
      note: t('statistics.minRequired', { n: settings.passing_score }),
    },
    {
      label: t('statistics.streak'),
      value: t('statistics.days', { n: streak.current }),
      note:
        streak.longest > streak.current
          ? t('statistics.longest', { n: streak.longest })
          : t('statistics.activeDiscipline'),
      icon: true,
    },
    {
      label: t('statistics.testsTaken'),
      value: t('statistics.count', { n: attempts.length }),
      note: attempts.length
        ? t('statistics.passedCount', { n: passedAttempts.length })
        : t('statistics.noTestsYet'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="statistics" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">
              {t('statistics.title')}
            </h1>
            <p className="text-xs sm:text-sm text-white/50">
              {t('statistics.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {cards.map((card) => (
              <div
                key={card.label}
                className="bg-[#000000] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-2"
              >
                <span className="text-[11px] text-white/50 block uppercase">{card.label}</span>
                <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-1.5">
                  {card.icon && <Flame size={24} className="fill-white text-white" />}
                  {card.value}
                </div>
                <span className="text-[10px] text-white/70">{card.note}</span>
              </div>
            ))}
          </div>

          {/* Per-course breakdown, so the totals above are auditable. */}
          {overall.courses.length > 0 && (
            <div className="bg-[#000000] border border-white/15 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
              <h2 className="text-sm font-black uppercase tracking-wider text-white/70 font-mono">
                Kurslar bo&apos;yicha
              </h2>
              <div className="space-y-3">
                {overall.courses.map((course, index) => {
                  const status = overall.statuses[index];
                  return (
                    <div key={course.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">{course.title}</span>
                        <span className="text-white/50">
                          {status.completedLessons}/{status.totalLessons} · {status.percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${status.percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {overall.courses.length === 0 && (
            <div className="bg-[#000000] border border-white/10 rounded-3xl p-10 text-center text-white/50 text-sm">
              {t('statistics.noCourseYet')}
            </div>
          )}

          <DashboardFooter />
        </div>
      </main>
    </div>
  );
}
