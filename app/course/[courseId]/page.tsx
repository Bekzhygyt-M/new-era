import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, CheckCircle2, Lock, PlayCircle, Award, ClipboardList, LineChart } from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { requireUserPage, canAccessCourse } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getCourseStatus, certificateEligibility } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/** Course hub: modules, sequential lesson unlocking and progress (TZ §15). */
export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const auth = await requireUserPage(`/course/${courseId}`);

  const course = await db.getCourse(courseId);
  if (!course) notFound();

  if (!await canAccessCourse(auth.profile, course.id)) {
    redirect(`/checkout/${course.id}`);
  }

  const status = await getCourseStatus(auth.profile.id, course.id);
  const { eligible, checks } = await certificateEligibility(auth.profile.id, course.id);
  const certificate = (await db.getCertificates(auth.profile.id)).find((c) => c.course_id === course.id);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-24 sm:px-8">
        <header className="mb-8">
          <Link href="/dashboard" className="text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white">
            ← Kabinet
          </Link>

          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{course.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">{course.description}</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between text-xs font-bold">
              <span className="uppercase tracking-wider text-white/45">Umumiy progress</span>
              <span className="font-mono text-white">
                {status.completedLessons} / {status.totalLessons} dars · {status.percentage}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={status.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${status.percentage}%` }} />
            </div>

            {status.averageTestScore > 0 && (
              <p className="mt-3 text-[12px] text-white/40">
                O‘rtacha test natijasi: <span className="font-mono text-white/70">{status.averageTestScore}%</span>
              </p>
            )}
          </div>
        </header>

        {/* Modules */}
        {status.modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 px-6 py-16 text-center">
            <BookOpen size={26} className="mx-auto mb-3 text-white/25" />
            <p className="text-sm font-semibold text-white/60">Modullar hali qo‘shilmagan</p>
            <p className="mt-1 text-[13px] text-white/35">
              Kurs dasturi tayyorlanmoqda. Darslar qo‘shilishi bilan bildirishnoma keladi.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {status.modules.map((moduleStatus) => (
              <section
                key={moduleStatus.module.id}
                className={`overflow-hidden rounded-2xl border ${
                  moduleStatus.unlocked ? 'border-white/10' : 'border-white/[0.06] opacity-60'
                } bg-white/[0.015]`}
              >
                <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                  <h2 className="flex-1 text-sm font-bold text-white sm:text-base">
                    {moduleStatus.module.title}
                  </h2>

                  {moduleStatus.completed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      <CheckCircle2 size={11} /> Yakunlandi
                    </span>
                  ) : !moduleStatus.unlocked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/40">
                      <Lock size={11} /> Yopiq
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] font-bold text-white/50">
                      {moduleStatus.completedLessons}/{moduleStatus.totalLessons}
                    </span>
                  )}
                </header>

                {moduleStatus.lessons.length === 0 ? (
                  <p className="px-5 py-6 text-[13px] text-white/35">
                    Bu modulga darslar hali qo‘shilmagan.
                  </p>
                ) : (
                  <ol className="divide-y divide-white/[0.05]">
                    {moduleStatus.lessons.map((item, index) => {
                      const locked = item.state === 'locked';
                      const Icon = item.completed ? CheckCircle2 : locked ? Lock : PlayCircle;

                      const body = (
                        <div className="flex items-center gap-3.5 px-5 py-4">
                          <Icon
                            size={17}
                            className={
                              item.completed
                                ? 'shrink-0 text-emerald-400'
                                : locked
                                  ? 'shrink-0 text-white/25'
                                  : 'shrink-0 text-white'
                            }
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold text-white/85">
                              {index + 1}. {item.lesson.title}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-white/35">
                              {locked
                                ? item.lockReason
                                : item.completed
                                  ? `Yakunlandi · test ${item.testScore}%`
                                  : item.watchPercentage > 0
                                    ? `Ko‘rildi: ${item.watchPercentage}%`
                                    : 'Boshlanmagan'}
                            </span>
                          </span>

                          {!locked && (
                            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-white/35">
                              +{item.lesson.xp_reward} XP
                            </span>
                          )}
                        </div>
                      );

                      return (
                        <li key={item.lesson.id}>
                          {locked ? (
                            <div aria-disabled className="cursor-not-allowed">
                              {body}
                            </div>
                          ) : (
                            <Link href={`/lesson/${item.lesson.id}`} className="block transition hover:bg-white/[0.03]">
                              {body}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}

                {/* Practical requirements attached to the module (TZ §16). */}
                {(moduleStatus.requiresBacktest || moduleStatus.requiresJournal) && (
                  <div className="flex flex-wrap gap-3 border-t border-white/[0.06] px-5 py-3.5">
                    {moduleStatus.requiresBacktest && (
                      <Link
                        href="/backtest"
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          moduleStatus.backtestDone ? 'text-emerald-300' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        <LineChart size={12} />
                        Backtest {moduleStatus.backtestDone ? '✓' : '— bajarilishi kerak'}
                      </Link>
                    )}
                    {moduleStatus.requiresJournal && (
                      <Link
                        href="/journal"
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          moduleStatus.journalDone ? 'text-emerald-300' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        <ClipboardList size={12} />
                        Trading Journal {moduleStatus.journalDone ? '✓' : '— to‘ldirilishi kerak'}
                      </Link>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Certificate (TZ §23) */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award size={16} className="text-white/70" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Sertifikat</h2>
          </div>

          {certificate ? (
            <div className="space-y-2">
              <p className="text-[13px] text-white/60">
                Sertifikat berildi:{' '}
                <span className="font-mono font-bold text-white">{certificate.certificate_id}</span>
              </p>
              <Link
                href={`/certificate/${certificate.certificate_id}`}
                className="inline-flex rounded-xl bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-white/90"
              >
                Sertifikatni ochish
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check.key} className="flex items-center gap-2 text-[12.5px]">
                  {check.ok ? (
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                  ) : (
                    <Lock size={13} className="shrink-0 text-white/25" />
                  )}
                  <span className={check.ok ? 'text-white/70' : 'text-white/40'}>{check.label}</span>
                </li>
              ))}
              {!eligible && (
                <li className="pt-1 text-[11px] text-white/30">
                  Barcha shartlar bajarilgach sertifikat avtomatik ochiladi.
                </li>
              )}
            </ul>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
