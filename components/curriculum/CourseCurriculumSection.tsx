'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import CurriculumAccordion from './CurriculumAccordion';
import { useI18n } from '@/lib/i18n';
import { formatUzPrice } from '@/lib/format';
import type { CourseContent } from '@/lib/content/curriculum';

/**
 * One full course block for the homepage (TZ §5, §6): medal, name, price,
 * badge, tagline, every module with every topic, and the closing line.
 */
export default function CourseCurriculumSection({
  content,
  id,
  showCta = true,
}: {
  content: CourseContent;
  id?: string;
  showCta?: boolean;
}) {
  const { t } = useI18n();
  // Deterministic price string to avoid browser vs node locale hydration discrepancies.
  const priceLabel = `${formatUzPrice(content.price)} ${t('common.currencySom')}`;
  const accentText =
    content.accent === 'pink'
      ? 'text-pink-300'
      : content.accent === 'purple'
        ? 'text-purple-300'
        : content.accent === 'gold'
          ? 'text-amber-300'
          : 'text-white';

  const accentBorder =
    content.accent === 'pink'
      ? 'border-pink-500/30'
      : content.accent === 'purple'
        ? 'border-purple-500/25'
        : content.accent === 'gold'
          ? 'border-amber-400/25'
          : 'border-white/15';

  return (
    <section id={id || content.slug} className="border-t border-white/[0.06] bg-[#060606] py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-9"
        >
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {content.medal}
            </span>
            <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${accentText}`}>
              {content.name}
            </h2>
            <span suppressHydrationWarning className="text-lg font-bold text-white/80 sm:text-xl">— {priceLabel}</span>
            {content.badge && (
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/85 ${accentBorder}`}
              >
                {content.badge}
              </span>
            )}
          </div>

          <p className="flex items-center gap-2 text-sm font-semibold text-white/55 sm:text-base">
            <span aria-hidden="true">{content.taglineEmoji}</span>
            {content.tagline}
          </p>
        </motion.header>

        {/* VIP is a benefits list rather than a module tree. */}
        {content.perks?.length ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {content.perks.map((perk) => (
              <li
                key={perk}
                className={`rounded-xl border bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium leading-relaxed text-white/75 ${accentBorder}`}
              >
                {perk}
              </li>
            ))}
          </ul>
        ) : (
          <CurriculumAccordion modules={content.modules} accent={content.accent} />
        )}

        {content.outro && (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-[13px] font-semibold leading-relaxed text-white/70">
            {content.outro}
          </p>
        )}

        {showCta && (
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/courses/${content.slug}`}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-white/90"
            >
              {t('courses.fullPlan')}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/checkout/${content.courseId}`}
              suppressHydrationWarning
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white transition hover:border-white/40 hover:bg-white/[0.05]"
            >
              {t('courses.buyForPrice', { price: priceLabel })}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
