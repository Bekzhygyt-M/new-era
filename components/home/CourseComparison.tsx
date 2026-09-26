import { Check, Minus } from 'lucide-react';
import { localizeAll } from '@/lib/content/curriculum-i18n';
import { getTranslations } from '@/lib/i18n/server';
import { db } from '@/lib/db';
import { ALL_COURSES } from '@/lib/content/curriculum';
import { formatUzPrice } from '@/lib/format';

const COMPARISON_TEXT = {
  uz: {
    title: 'Tariflarni Taqqoslash (Standart vs Pro)',
    featureCol: 'Darslar & Xususiyatlar',
    perPeriod: '/ 30 kunga',
    rows: [
      { label: 'Trading nima? va Forex asoslari', standard: true, pro: true },
      { label: 'MT5 platformasi bilan professional ishlash', standard: true, pro: true },
      { label: 'Brokerlar va Prop firmalar tahlili', standard: true, pro: true },
      { label: 'Fundamental yangiliklar bilan ishlash', standard: true, pro: true },
      { label: 'Klassik modellar va SNR tahlili', standard: true, pro: true },
      { label: 'ICT konsepsiyasi (kirish va chuqurlashtirilgan)', standard: true, pro: true },
      { label: 'SMS (Smart Money Structure) strategiyasi', standard: false, pro: true },
      { label: 'Trading Line va Fibonacci strategiyalari', standard: false, pro: true },
      { label: 'AMD strategiyasi va Individual strategiya', standard: false, pro: true },
      { label: 'Psixologiya bo‘limi va amaliy maslahatlar', standard: false, pro: true },
      { label: 'Trading jurnal yuritish va risk nazorati', standard: false, pro: true },
      { label: '30 kunlik darslarga to‘liq kirish limiti', standard: true, pro: true },
    ],
  },
  ru: {
    title: 'Сравнение Тарифов (Standart vs Pro)',
    featureCol: 'Уроки и Возможности',
    perPeriod: '/ 30 дней',
    rows: [
      { label: 'Что такое трейдинг? и основы Forex', standard: true, pro: true },
      { label: 'Профессиональная работа с платформой MT5', standard: true, pro: true },
      { label: 'Анализ брокеров и проп-компаний', standard: true, pro: true },
      { label: 'Работа с фундаментальными новостями', standard: true, pro: true },
      { label: 'Классические паттерны и анализ SNR', standard: true, pro: true },
      { label: 'Концепция ICT (базовая и углубленная)', standard: true, pro: true },
      { label: 'Стратегия SMS (Smart Money Structure)', standard: false, pro: true },
      { label: 'Стратегии Trading Line и Фибоначчи', standard: false, pro: true },
      { label: 'Стратегия AMD и индивидуальная стратегия', standard: false, pro: true },
      { label: 'Раздел психологии и практические советы', standard: false, pro: true },
      { label: 'Ведение торгового журнала и контроль рисков', standard: false, pro: true },
      { label: 'Полный доступ ко всем урокам на 30 дней', standard: true, pro: true },
    ],
  },
  en: {
    title: 'Tariff Comparison (Standard vs Pro)',
    featureCol: 'Lessons & Features',
    perPeriod: '/ 30 days',
    rows: [
      { label: 'What is trading? and Forex fundamentals', standard: true, pro: true },
      { label: 'Professional operation of MT5 platform', standard: true, pro: true },
      { label: 'In-depth analysis of Brokers & Prop firms', standard: true, pro: true },
      { label: 'Trading macroeconomic news & fundamentals', standard: true, pro: true },
      { label: 'Classical chart patterns and SNR analysis', standard: true, pro: true },
      { label: 'ICT concept (introductory & advanced)', standard: true, pro: true },
      { label: 'SMS (Smart Money Structure) strategy', standard: false, pro: true },
      { label: 'Trading Line and Fibonacci strategies', standard: false, pro: true },
      { label: 'AMD strategy and Individual strategy', standard: false, pro: true },
      { label: 'Trading psychology section & mindset tips', standard: false, pro: true },
      { label: 'Trading journal keeping & risk management', standard: false, pro: true },
      { label: 'Full 30-day complete curriculum access', standard: true, pro: true },
    ],
  },
};

export default async function CourseComparison() {
  const { locale, t } = await getTranslations();
  const localizedCourses = localizeAll(ALL_COURSES, locale);
  const comp = COMPARISON_TEXT[locale] || COMPARISON_TEXT.uz;

  const priceBySlug = new Map<string, string>(
    await Promise.all(
      localizedCourses.map(async (content) => {
        const course = await db.getCourse(content.courseId);
        return [
          content.slug,
          `${formatUzPrice(course?.price ?? content.price)} ${t('common.currencySom')}`,
        ] as const;
      })
    )
  );

  const price = (slug: string) => priceBySlug.get(slug) ?? '';

  const Cell = ({ on, isPro }: { on: boolean; isPro?: boolean }) =>
    on ? (
      <Check size={16} className={`mx-auto ${isPro ? 'text-pink-400' : 'text-emerald-400'}`} aria-label="Mavjud" />
    ) : (
      <Minus size={16} className="mx-auto text-white/20" aria-label="Mavjud emas" />
    );

  return (
    <section className="border-t border-white/[0.08] bg-[#050505] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <h2 className="mb-8 text-center text-2xl font-black tracking-tight text-white sm:text-3xl">
          {comp.title}
        </h2>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0d] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th scope="col" className="py-4 px-5 text-[11px] font-black uppercase tracking-wider text-white/40">
                    {comp.featureCol}
                  </th>
                  {localizedCourses.map((course) => {
                    const isPro = course.slug === 'pro';
                    return (
                      <th key={course.slug} scope="col" className="px-4 py-4 text-center">
                        <span className={`block text-sm font-black ${isPro ? 'text-pink-400' : 'text-white'}`}>
                          {course.medal} {course.name}
                        </span>
                        <span className="mt-1 block font-mono text-[11px] text-white/50">
                          {price(course.slug)} {comp.perPeriod}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {comp.rows.map((row) => (
                  <tr key={row.label} className="hover:bg-white/[0.02] transition">
                    <th scope="row" className="py-3 px-5 text-[12.5px] font-medium text-white/70 font-sans">
                      {row.label}
                    </th>
                    <td className="px-4 py-3 text-center">
                      <Cell on={row.standard} />
                    </td>
                    <td className="px-4 py-3 text-center bg-pink-500/[0.02]">
                      <Cell on={row.pro} isPro />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
