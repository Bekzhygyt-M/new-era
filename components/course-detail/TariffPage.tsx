import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ArrowRight, BookOpen, Check } from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import CurriculumAccordion from '@/components/curriculum/CurriculumAccordion';
import { getCourseContent, type CourseContent } from '@/lib/content/curriculum';
import { localizeCurriculum } from '@/lib/content/curriculum-i18n';
import { getTranslations } from '@/lib/i18n/server';
import { db } from '@/lib/db';
import { formatUzPrice } from '@/lib/format';

/**
 * One tariff page, shared by /courses/standard, /pro and /vip (TZ §5).
 *
 * The syllabus is read from lib/content/curriculum — the single copy of the
 * specification text. The three pages previously each carried their own copy,
 * complete with invented lesson durations for lessons that do not exist; both
 * the duplication and the invented figures are gone.
 *
 * The price comes from the database, so an admin's edit is reflected here
 * rather than contradicted by a hard-coded number.
 */
const ACCENT = {
  neutral: { ring: 'border-white/15', text: 'text-white', glow: '' },
  pink: { ring: 'border-pink-500/30', text: 'text-pink-300', glow: 'shadow-[0_0_60px_-20px_rgba(236,72,153,0.35)]' },
  purple: { ring: 'border-purple-500/30', text: 'text-purple-300', glow: 'shadow-[0_0_60px_-20px_rgba(168,85,247,0.35)]' },
  gold: { ring: 'border-amber-500/30', text: 'text-amber-300', glow: 'shadow-[0_0_60px_-20px_rgba(245,158,11,0.3)]' },
} as const;

export default async function TariffPage({ slug }: { slug: CourseContent['slug'] }) {
  const source = getCourseContent(slug);
  if (!source) notFound();

  const { locale, t } = await getTranslations();
  const content = localizeCurriculum(source, locale);
  const course = await db.getCourse(content.courseId);

  // The stored price wins; the specification value is the fallback.
  const price = course?.price ?? content.price;
  const priceLabel = `${formatUzPrice(price)} ${t('common.currencySom')}`;
  const accent = ACCENT[content.accent];
  const topicCount = content.modules.reduce((sum, m) => sum + m.topics.length, 0);

  return (
    <div className="flex min-h-screen flex-col justify-between bg-black text-white">
      <Navbar />

      <main className="flex-grow px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 font-mono text-xs text-white/50 transition hover:text-white"
          >
            <ChevronLeft size={14} /> {t('courses.backToCourses')}
          </Link>

          {/* Header */}
          <header className={`rounded-3xl border ${accent.ring} bg-[#0a0a0a] p-8 sm:p-10 ${accent.glow}`}>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                <span className="mr-2">{content.medal}</span>
                <span className={accent.text}>{content.name}</span>
                <span suppressHydrationWarning className="text-white/50"> — {priceLabel}</span>
              </h1>
              {content.badge && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider">
                  {content.badge}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-white/60">
              {content.taglineEmoji} {content.tagline}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-5 font-mono text-xs text-white/50">
              {content.modules.length > 0 && (
                <span className="flex items-center gap-2">
                  <BookOpen size={14} className="text-white" />
                  {content.modules.length} {t('courses.modulesCount')} · {topicCount} {t('courses.topics')}
                </span>
              )}
              {content.perks && (
                <span className="flex items-center gap-2">
                  <Check size={14} className="text-white" />
                  {content.perks.length} {t('courses.opportunities')}
                </span>
              )}
            </div>

            <Link
              href={`/checkout/${content.courseId}`}
              suppressHydrationWarning
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black uppercase tracking-wider text-black shadow-xl transition hover:bg-neutral-200"
            >
              {t('courses.buyFor')} — {priceLabel}
              <ArrowRight size={16} />
            </Link>
          </header>

          {/* Syllabus, or the benefit list for a course that is not module-based */}
          {content.modules.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                {t('courses.fullPlan')} ({content.modules.length} {t('courses.modulesCount')})
              </h2>
              <CurriculumAccordion modules={content.modules} accent={content.accent} />
            </section>
          ) : (
            <section className="space-y-4">
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t('courses.whatIncluded')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {content.perks?.map((perk) => (
                  <li
                    key={perk}
                    className={`rounded-2xl border ${accent.ring} bg-[#0a0a0a] px-4 py-3 text-sm text-white/80`}
                  >
                    {perk}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {content.outro && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm leading-relaxed text-white/60">
              {content.outro}
            </p>
          )}

          {/* Closing call to action */}
          <section className={`rounded-3xl border ${accent.ring} bg-[#0a0a0a] p-8 text-center`}>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t('courses.startNow')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
              {t('courses.fullAccess')}
            </p>
            <Link
              href={`/checkout/${content.courseId}`}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black uppercase tracking-wider text-black shadow-xl transition hover:bg-neutral-200"
            >
              {priceLabel} — {t('courses.buyFor')}
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
