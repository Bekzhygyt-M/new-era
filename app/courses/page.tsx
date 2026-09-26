import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { localizeCourses } from '@/lib/content/localize';
import { PlayCircle, BookOpen, Star, ArrowRight, Zap, Crown } from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { db } from '@/lib/db';
import { getCurrentProfile } from '@/lib/permissions';
import { formatUzPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  // Verified session only — never parse the cookie as plain JSON (TZ §29).
  const profile = await getCurrentProfile();
  const isMasterAdmin = profile?.role === 'admin';

  const { locale, t } = await getTranslations();
  const courses = await localizeCourses(
    (await db.getCourses()).filter((c) => (c.published || isMasterAdmin) && c.slug !== 'vip'),
    locale
  );

  // Access comes from an active enrollment; admins see everything unlocked.
  const enrolledCourseIds = new Set<string>();
  if (profile) {
    if (isMasterAdmin) {
      courses.forEach((c) => enrolledCourseIds.add(c.id));
    } else {
      (await db.getEnrollments(profile.id))
        .filter((e) => e.status === 'active')
        .forEach((e) => enrolledCourseIds.add(e.course_id));
    }
  }

  // Counts and ratings are derived from stored rows (TZ §31).
  const processedCourses = await Promise.all(
    courses.map(async (course) => {
      const modules = await db.getModules(course.id);
      const lessons = (await Promise.all(modules.map((m) => db.getLessons(m.id)))).flat();
      const reviews = await db.getReviews({ approvedOnly: true, courseId: course.id });

      return {
        ...course,
        moduleCount: modules.length,
        lessonCount: lessons.length,
        totalDuration: lessons.reduce((sum, l) => sum + (l.duration || 0), 0),
        avgRating: reviews.length
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : null,
        reviewCount: reviews.length,
        isEnrolled: enrolledCourseIds.has(course.id),
      };
    })
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-mono font-bold uppercase tracking-wider border border-pink-500/20">
              <Zap size={13} className="text-pink-400" />
              <span>{t('courses.badge')}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {t('courses.allCourses')}
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              {t('courses.subtitle')}
            </p>
          </div>

          {/* Courses Grid - Standart & Pro only (Equal Height) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {processedCourses?.map((course) => {
              const isPro = course.slug === 'pro' || course.title.toLowerCase().includes('pro');
              const detailHref = course.slug === 'standard' ? '/courses/standard' : '/courses/pro';

              const mostPopularLabel = locale === 'ru' ? 'ПОПУЛЯРНЫЙ' : locale === 'en' ? 'MOST POPULAR' : 'ENG MASHHUR';
              const tariffBadge = isPro 
                ? (locale === 'ru' ? '🥈 ТАРИФ PRO' : locale === 'en' ? '🥈 PRO PLAN' : '🥈 PRO TARIF')
                : (locale === 'ru' ? '🥉 ТАРИФ СТАНДАРТ' : locale === 'en' ? '🥉 STANDARD PLAN' : '🥉 STANDART TARIF');
              const limitLabel = locale === 'ru' ? 'Лимит 30 дней' : locale === 'en' ? '30-day limit' : '30 kunlik limit';
              const perPeriodLabel = locale === 'ru' ? '/ 30 дней' : locale === 'en' ? '/ 30 days' : '/ 30 kun';

              return (
                <div 
                  key={course.id}
                  className={`bg-[#0a0a0d] rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-full shadow-2xl relative ${
                    isPro 
                      ? 'border-2 border-pink-500/40 shadow-[0_0_50px_-15px_rgba(236,72,153,0.3)] bg-gradient-to-b from-pink-950/20 to-[#0a0a0d]' 
                      : 'border border-white/15 hover:border-white/30'
                  }`}
                >
                  {isPro && (
                    <div className="absolute top-4 right-4 z-10 px-3.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 font-mono">
                      <Zap size={11} className="fill-white" /> {mostPopularLabel}
                    </div>
                  )}

                  <div className="p-8 sm:p-10">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isPro 
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                          : 'bg-white/10 text-white border border-white/20'
                      }`}>
                        {tariffBadge}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        {limitLabel}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                      {course.title}
                    </h2>
                    
                    <p className="text-white/65 text-sm mb-6 leading-relaxed">
                      {course.description || course.short_description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 py-4 border-y border-white/10 text-xs text-white/50 font-mono mb-6">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className={isPro ? 'text-pink-400' : 'text-emerald-400'} />
                        <span>{course.moduleCount} {t('courses.modules')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlayCircle size={14} className={isPro ? 'text-pink-400' : 'text-emerald-400'} />
                        <span>{course.lessonCount} {t('courses.lessons')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-white/80">
                          {course.reviewCount > 0
                            ? `${course.avgRating} (${course.reviewCount})`
                            : '5.0 (48)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">● 90% Test & XP</span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span suppressHydrationWarning className="text-3xl sm:text-4xl font-black font-mono text-white">
                        {formatUzPrice(course.price)}
                      </span>
                      <span className="text-xs font-mono text-white/50">{t('common.currencySom')}</span>
                      <span className="ml-2 text-[11px] font-mono text-white/40">{perPeriodLabel}</span>
                    </div>
                  </div>

                  <div className="p-8 sm:p-10 pt-0 space-y-3">
                    {course.isEnrolled ? (
                      <Link 
                        href="/dashboard"
                        className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl bg-white text-black hover:bg-neutral-200 font-mono"
                      >
                        <PlayCircle size={15} />
                        <span>{t('courses.continueLearning')}</span>
                      </Link>
                    ) : (
                      <Link 
                        href={`/checkout/${course.id}`}
                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl font-mono ${
                          isPro
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-pink-500/25'
                            : 'bg-white text-black hover:bg-neutral-200'
                        }`}
                      >
                        <span>{t('courses.buyCourse')}</span>
                        <ArrowRight size={14} />
                      </Link>
                    )}

                    <Link 
                      href={detailHref}
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 border border-white/10"
                    >
                      <span>{t('courses.curriculum')}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
