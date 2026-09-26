'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { CourseContent } from '@/lib/content/curriculum';
import { formatUzPrice } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

interface PricingTier {
  daily: number;
  monthly: number;
  yearly: number;
}

interface CourseCardsClientProps {
  courses: {
    content: CourseContent;
    note: string;
    published: boolean;
    pricing: PricingTier;
  }[];
  title: string;
  bestOrder: string;
  bestOrderSub: string;
  currencySom: string;
}

const UI_TEXT = {
  uz: {
    badge: 'Faqat Standart va Pro',
    daily: 'Kunlik',
    monthly: 'Oylik (30 kun)',
    recommended: 'Tavsiya',
    yearly: 'Yillik',
    perDay: '/ kuniga',
    perMonth: '/ 30 kunga',
    perYear: '/ 365 kunga',
    durationDay: '1 kun',
    durationMonth: '30 kun',
    durationYear: '365 kun',
    modulesHeader: 'Asosiy dastur yo‘nalishlari:',
    buy: 'Sotib olish',
    comingSoon: 'Tez kunda',
    viewCurriculum: 'To‘liq dasturni ko‘rish',
    showModules: 'Barcha modullar mundarijasi',
    hideModules: 'Mundarijani yopish',
    highlights: {
      standard: [
        'Trading nima? & Forex asoslari',
        'MT5 terminali va Brokerlar tahlili',
        'Prop firmalar & Fundamental yangiliklar',
        'Klassika va ICT tahlili',
        '8 ta to‘liq modul (90% test tizimi)',
      ],
      pro: [
        'Barcha Standart modullari kiritilgan',
        'SNR, SMS, Trading Line & Fibonacci',
        'ICT, Individual va AMD strategiyalari',
        'Psixologiya bo‘limi, Risk menejment & Jurnal',
        '14 ta chuqur modul (XP reyting & sertifikat)',
      ],
    },
  },
  ru: {
    badge: 'Только Standart и Pro',
    daily: 'Дневной',
    monthly: 'Месячный (30 дней)',
    recommended: 'Рекомендуем',
    yearly: 'Годовой',
    perDay: '/ день',
    perMonth: '/ 30 дней',
    perYear: '/ 365 дней',
    durationDay: '1 день',
    durationMonth: '30 дней',
    durationYear: '365 дней',
    modulesHeader: 'Основные направления программы:',
    buy: 'Купить',
    comingSoon: 'Скоро',
    viewCurriculum: 'Смотреть полную программу',
    showModules: 'Содержание всех модулей',
    hideModules: 'Скрыть содержание',
    highlights: {
      standard: [
        'Что такое трейдинг & основы Forex',
        'Терминал MT5 и анализ брокеров',
        'Prop-компании & фундаментальные новости',
        'Классический анализ и основы ICT',
        '8 полных модулей (система теста 90%)',
      ],
      pro: [
        'Все модули тарифа Standart включены',
        'Модели SNR, SMS, Trading Line & Fibonacci',
        'ICT, Индивидуальная стратегия и AMD',
        'Отдел психологии, Риск-менеджмент & Журнал',
        '14 углубленных модулей (XP & сертификат)',
      ],
    },
  },
  en: {
    badge: 'Standard & Pro Only',
    daily: 'Daily',
    monthly: 'Monthly (30 days)',
    recommended: 'Recommended',
    yearly: 'Yearly',
    perDay: '/ day',
    perMonth: '/ 30 days',
    perYear: '/ 365 days',
    durationDay: '1 day',
    durationMonth: '30 days',
    durationYear: '365 days',
    modulesHeader: 'Key curriculum highlights:',
    buy: 'Enroll now',
    comingSoon: 'Coming soon',
    viewCurriculum: 'View full curriculum',
    showModules: 'Full module contents',
    hideModules: 'Hide module contents',
    highlights: {
      standard: [
        'What is Trading? & Forex fundamentals',
        'MT5 terminal & broker analysis',
        'Prop firms & fundamental market news',
        'Classical analysis and ICT basics',
        '8 complete modules (90% passing gate)',
      ],
      pro: [
        'All Standard tariff modules included',
        'SNR, SMS, Trading Line & Fibonacci models',
        'ICT, Individual Strategy & AMD models',
        'Psychology section, Risk management & Journal',
        '14 advanced modules (XP & certificate)',
      ],
    },
  },
};

export default function CourseCardsClient({
  courses,
  title,
  bestOrder,
  bestOrderSub,
  currencySom,
}: CourseCardsClientProps) {
  const { locale } = useI18n();
  const tUi = UI_TEXT[locale] || UI_TEXT.uz;
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const formatPrice = (value: number) =>
    `${formatUzPrice(value)} ${currencySom}`;

  const toggleExpand = (slug: string) => {
    setExpandedModules((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <section id="courses" className="border-t border-white/10 bg-[#050505] py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle radial pink/emerald ambient background */}
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
      />

      <div className="mx-auto max-w-5xl px-5 sm:px-8 relative z-10">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            <Sparkles size={13} />
            {tUi.badge}
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-sm font-semibold text-white/60">{bestOrder}</p>
          <p className="mt-1 text-[13px] text-white/35">{bestOrderSub}</p>
        </header>

        {/* 2-Card Grid: Standart & Pro only (Equal Height) */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto items-stretch">
          {courses.map(({ content, note, published }) => {
            const isPro = content.slug === 'pro';
            const price = content.price;
            const highlights = isPro ? tUi.highlights.pro : tUi.highlights.standard;
            const isExpanded = !!expandedModules[content.slug];

            return (
              <article
                key={content.slug}
                className={`relative flex flex-col justify-between h-full rounded-3xl border p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl ${
                  isPro
                    ? 'border-pink-500/40 bg-[#0d0a10] hover:border-pink-500/70 shadow-pink-500/10'
                    : 'border-white/15 bg-[#0a0a0d] hover:border-white/30'
                }`}
              >
                {/* Badge */}
                {content.badge && (
                  <span className="absolute -top-3 left-8 rounded-full border border-pink-500/40 bg-pink-500/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-pink-300 backdrop-blur-md">
                    {content.badge}
                  </span>
                )}

                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">
                      {content.medal}
                    </span>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-white">{content.name}</h3>
                      <p className="text-[12px] font-semibold text-white/45">{note}</p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <Clock size={12} /> {isPro ? '14 ta modul' : '8 ta modul'}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-2 flex items-baseline gap-2">
                  <div suppressHydrationWarning className="font-mono text-3xl sm:text-4xl font-black text-white">
                    {formatPrice(price)}
                  </div>
                </div>

                <p className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-white/70">
                  <span aria-hidden="true">{content.taglineEmoji}</span>
                  {content.tagline}
                </p>

                {/* Compact Highlights list */}
                <div className="mb-6 flex-1 space-y-3 border-t border-white/[0.08] pt-5">
                  <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/40 mb-2">
                    {tUi.modulesHeader}
                  </p>
                  <ul className="space-y-2.5">
                    {highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[13px] text-white/85">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check size={11} className="stroke-[3]" />
                        </span>
                        <span className="font-semibold">{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Toggle accordion for full module syllabus */}
                  <div className="pt-2 border-t border-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => toggleExpand(content.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-pink-400/90 hover:text-pink-300 transition"
                    >
                      <span>
                        {isExpanded ? tUi.hideModules : `${tUi.showModules} (${content.modules.length} ta modul)`}
                      </span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {isExpanded && (
                      <ul className="mt-3 space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                        {content.modules.map((module) => (
                          <li key={module.title} className="flex items-start gap-2.5 text-white/80">
                            <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                            <div>
                              <strong className="text-white font-semibold">{module.emoji} {module.title}</strong>
                              <span className="block text-[11px] text-white/40 mt-0.5 line-clamp-1">
                                {module.topics.join(' • ')}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-4 mt-auto">
                  <Link
                    href={published ? `/checkout/${content.courseId}` : '/courses'}
                    aria-disabled={!published}
                    className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-black uppercase tracking-wider transition ${
                      isPro
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:opacity-95'
                        : 'bg-white text-black hover:bg-neutral-200 shadow-lg'
                    }`}
                  >
                    <span>{published ? `${tUi.buy} — ${formatPrice(price)}` : tUi.comingSoon}</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href={`/courses/${content.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-[11px] font-bold uppercase tracking-wider text-white/70 transition hover:border-white/35 hover:text-white"
                  >
                    {tUi.viewCurriculum}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
