import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { translationMap, localizeCourse, localizeModule, localizeLesson } from '@/lib/content/localize';
import { notFound } from 'next/navigation';
import {
  Lock,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  Award,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { getCurrentProfile, canAccessCourse } from '@/lib/permissions';
import { db } from '@/lib/db';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();

  // getCourse resolves by id *or* slug, so /courses/pro and /courses/<uuid>
  // both land on the same record (TZ §6).
  const baseCourse = await db.getCourse(courseId);
  if (!baseCourse) notFound();

  // ru/en overrides for the course and everything nested under it (TZ §25).
  const { locale, t } = await getTranslations();
  const [courseT, moduleT, lessonT] = await Promise.all([
    translationMap('course', locale),
    translationMap('module', locale),
    translationMap('lesson', locale),
  ]);
  const course = localizeCourse(baseCourse, courseT.get(baseCourse.id));

  const hasAccess = await canAccessCourse(profile, course.id);

  // TZ §7.6 — a lesson unlocks only once the previous lesson's test is passed.
  const passedTestLessonIds = new Set<string>(
    profile
      ? (await db.getProgress(profile.id))
          .filter((p) => p.test_passed)
          .map((p) => p.lesson_id)
      : []
  );

  const modules = await Promise.all(
    (await db.getModules(course.id)).map(async (m) => ({
      ...localizeModule(m, moduleT.get(m.id)),
      lessons: (await db.getLessons(m.id))
        .filter((l) => l.is_published)
        .map((l) => localizeLesson(l, lessonT.get(l.id))),
    }))
  );

  const allLessons = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));

  const isPro = course.slug === 'pro' || course.level === 'pro';
  const isVip = course.slug === 'vip' || course.level === 'vip';

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between">
      <Navbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Back link */}
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white transition"
          >
            <ChevronLeft size={14} /> {t('courses.allCoursesLink')}
          </Link>

          {/* Hero Banner */}
          <div className="bg-[#0a0a0a] border border-white/15 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  {isVip ? '👑 VIP' : isPro ? '🥈 PRO' : '🥉 STANDARD'}
                </span>
                {hasAccess && (
                  <span className="bg-white/10 border border-white/20 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full">
                    ✓ {t('courses.courseUnlocked')}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-white/70 text-base sm:text-lg leading-relaxed">
                {course.description || course.short_description}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-4 text-xs sm:text-sm font-mono text-white/60">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-white" />
                  <span>{modules.length} {t('courses.modules')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PlayCircle size={16} className="text-white" />
                  <span>{allLessons.length} {t('courses.lessons')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-white" />
                  <span>90% {t('courses.testAndXp')}</span>
                </div>
              </div>

              {!hasAccess && (
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-mono text-white/50 block">{t('courses.coursePrice')}</span>
                    <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                      {new Intl.NumberFormat('uz-UZ').format(course.price)} {t('common.currencySom')}
                    </span>
                  </div>

                  <Link
                    href={`/checkout/${course.id}`}
                    className="px-8 py-4 font-black text-sm uppercase tracking-wider rounded-xl transition shadow-xl text-center flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200"
                  >
                    <span>{t('courses.buyCourse')}</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Curriculum List */}
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('courses.lessonPlan')}
            </h2>

            {modules.length === 0 ? (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 text-center text-white/50">
                {t('courses.noLessonsYet')}
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((m) => (
                  <div key={m.id} className="bg-[#0a0a0a] border border-white/15 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">
                        {m.title}
                      </h3>
                      <span className="text-xs font-mono text-white/40">
                        {m.lessons.length} {t('courses.lessons')}
                      </span>
                    </div>

                    <div className="divide-y divide-white/5">
                      {m.lessons.map((lesson) => {
                        const globalIndex = allLessons.findIndex(l => l.id === lesson.id);
                        const isFirst = globalIndex === 0;
                        const prevLesson = globalIndex > 0 ? allLessons[globalIndex - 1] : null;
                        const prevTestPassed = prevLesson ? passedTestLessonIds.has(prevLesson.id) : true;
                        
                        const isPreview = Boolean(lesson.preview_enabled);
                        const isUnlocked = (hasAccess && (isFirst || prevTestPassed)) || isPreview;
                        const testPassed = passedTestLessonIds.has(lesson.id);

                        return (
                          <div key={lesson.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-3">
                              {testPassed ? (
                                <CheckCircle2 size={18} className="text-white shrink-0" />
                              ) : isUnlocked ? (
                                <PlayCircle size={18} className="text-white/60 shrink-0" />
                              ) : (
                                <Lock size={18} className="text-white/25 shrink-0" />
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                                  {lesson.title}
                                </span>
                                {isPreview && !hasAccess && (
                                  <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                                    Bepul Preview
                                  </span>
                                )}
                                {lesson.xp_reward && (
                                  <span className="text-[10px] font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                                    +{lesson.xp_reward} XP
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {isUnlocked ? (
                                <Link
                                  href={`/lesson/${lesson.id}`}
                                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black font-mono text-xs font-bold transition"
                                >
                                  {isPreview && !hasAccess ? 'Bepul ko‘rish' : t('courses.watch')}
                                </Link>
                              ) : (
                                <span className="text-xs font-mono text-white/30 flex items-center gap-1">
                                  <Lock size={12} /> {t('courses.locked')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
