import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { localizeCourse, localizeModule, localizeLesson } from '@/lib/content/localize';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, FileText, BookMarked, Paperclip, Lock, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import VideoPlayerClient from './VideoPlayerClient';
import { requireUserPage, canAccessCourse } from '@/lib/permissions';
import { db } from '@/lib/db';
import { getCourseStatus, isLessonUnlocked } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * Lesson page (TZ §11).
 *
 * Video → summary → key terms → test. Access, sequence and the watch gate are
 * all resolved on the server; the client never decides what is unlocked.
 */
export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const auth = await requireUserPage(`/lesson/${lessonId}`);

  const baseLesson = await db.getLesson(lessonId);
  if (!baseLesson || (!baseLesson.is_published && !auth.isAdmin)) notFound();

  const baseModule = await db.getModule(baseLesson.module_id);
  const baseCourse = baseModule ? await db.getCourse(baseModule.course_id) : null;
  if (!baseModule || !baseCourse) notFound();

  // Title, summary and key terms follow the reader's language (TZ §25).
  const { locale, t } = await getTranslations();
  const [lessonT, moduleT, courseT] = await Promise.all([
    db.getTranslation('lesson', baseLesson.id, locale === 'ru' || locale === 'en' ? locale : 'ru'),
    db.getTranslation('module', baseModule.id, locale === 'ru' || locale === 'en' ? locale : 'ru'),
    db.getTranslation('course', baseCourse.id, locale === 'ru' || locale === 'en' ? locale : 'ru'),
  ]);
  const translatable = locale === 'ru' || locale === 'en';
  const lesson = localizeLesson(baseLesson, translatable ? lessonT ?? undefined : undefined);
  const lessonModule = localizeModule(baseModule, translatable ? moduleT ?? undefined : undefined);
  const course = localizeCourse(baseCourse, translatable ? courseT ?? undefined : undefined);

  const isPreview = Boolean(baseLesson.preview_enabled);

  if (!auth.isAdmin && !isPreview && !(await canAccessCourse(auth.profile, course.id))) {
    redirect(`/checkout/${course.id}`);
  }

  const unlock = await isLessonUnlocked(auth.profile.id, lesson.id);
  if (!unlock.unlocked && !auth.isAdmin && !isPreview) {
    redirect(`/course/${course.id}?locked=${encodeURIComponent(unlock.reason || '')}`);
  }

  const settings = await db.getSettings();
  const progress = await db.getLessonProgress(auth.profile.id, lesson.id);
  const test = await db.getTestByLesson(lesson.id);
  const status = await getCourseStatus(auth.profile.id, course.id);

  // Locate the next lesson in course order for the "next" link.
  const ordered = status.modules.flatMap((m) => m.lessons);
  const currentIndex = ordered.findIndex((l) => l.lesson.id === lesson.id);
  const nextLesson = currentIndex >= 0 ? ordered[currentIndex + 1] : undefined;

  const requirement = lesson.watch_requirement || settings.watch_requirement;

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-24 sm:px-8">
        <Link
          href={`/course/${course.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40 transition hover:text-white"
        >
          <ChevronLeft size={13} />
          {course.title}
        </Link>

        <header className="mb-6 mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/35">
            {lessonModule.title}
          </p>
          <h1 className="text-xl font-black leading-tight tracking-tight sm:text-2xl">{lesson.title}</h1>
          {lesson.short_description && (
            <p className="mt-2 text-sm leading-relaxed text-white/50">{lesson.short_description}</p>
          )}
        </header>

        <VideoPlayerClient
          lessonId={lesson.id}
          videoUrl={lesson.video_url}
          provider={lesson.video_provider || 'file'}
          duration={lesson.duration}
          watchRequirement={requirement}
          allowSeeking={Boolean(lesson.allow_seeking)}
          initialWatchedSeconds={progress?.watched_seconds ?? 0}
          initialPercentage={progress?.watch_percentage ?? 0}
          testId={test?.id ?? null}
          testPassed={progress?.test_passed ?? false}
          testScore={progress?.test_score ?? 0}
          passingScore={test?.passing_score ?? settings.passing_score}
          nextLessonId={nextLesson?.lesson.id ?? null}
          nextLessonLocked={nextLesson ? nextLesson.state === 'locked' : false}
          courseId={course.id}
          viewerName={auth.profile.full_name}
          viewerEmail={auth.profile.email}
          viewerId={auth.profile.id}
          telegramChannelUrl={
            (lesson as { telegram_channel_url?: string }).telegram_channel_url ||
            settings.telegram_channel_url ||
            settings.support_telegram ||
            'https://t.me/newera_trading'
          }
        />

        {/* Summary (TZ §7.3) */}
        {lesson.summary && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/50">
              <FileText size={13} /> {t('lesson.summary')}
            </h2>
            <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/70">
              {lesson.summary}
            </div>
          </section>
        )}

        {/* Key terms (TZ §7.3) */}
        {lesson.key_terms && lesson.key_terms.length > 0 && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/50">
              <BookMarked size={13} /> {t('lesson.keyTerms')}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {lesson.key_terms.map((term) => (
                <div key={term.term} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <dt className="mb-1 text-[12.5px] font-bold text-white">{term.term}</dt>
                  <dd className="text-[12px] leading-relaxed text-white/55">{term.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {lesson.description && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-wider text-white/50">
              {t('lesson.description')}
            </h2>
            <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/65">
              {lesson.description}
            </div>
          </section>
        )}

        {/* Materials (TZ §11) */}
        {lesson.materials && lesson.materials.length > 0 && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/50">
              <Paperclip size={13} /> Qo‘shimcha materiallar
            </h2>
            <ul className="space-y-2">
              {lesson.materials.map((material) => (
                <li key={material.url}>
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-semibold text-white/75 underline underline-offset-4 transition hover:text-white"
                  >
                    {material.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Next lesson */}
        <nav className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <span className="text-[12px] text-white/45">
            {nextLesson ? t('lesson.nextLesson') : t('lesson.lastInModule')}
          </span>

          {nextLesson ? (
            nextLesson.state === 'locked' ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white/35">
                <Lock size={12} /> {nextLesson.lesson.title}
              </span>
            ) : (
              <Link
                href={`/lesson/${nextLesson.lesson.id}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white hover:underline"
              >
                <CheckCircle2 size={12} /> {nextLesson.lesson.title}
              </Link>
            )
          ) : (
            <Link href={`/course/${course.id}`} className="text-[12px] font-bold text-white hover:underline">
              {t('lesson.backToCourse')}
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}
