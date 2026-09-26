import { db } from '@/lib/db';
import { getTranslations } from '@/lib/i18n/server';
import { ALL_COURSES } from '@/lib/content/curriculum';

const STAT_LABELS = {
  uz: {
    subscribers: 'Faol obunachilar',
    tariffs: 'Tarif (Standart & Pro)',
    modules: 'Asosiy modullar',
    two: '2 ta',
    modulesCount: (n: number) => `${n} ta`,
  },
  ru: {
    subscribers: 'Активных подписчиков',
    tariffs: 'Тарифа (Standart & Pro)',
    modules: 'Основных модулей',
    two: '2',
    modulesCount: (n: number) => `${n}`,
  },
  en: {
    subscribers: 'Active subscribers',
    tariffs: 'Plans (Standard & Pro)',
    modules: 'Core modules',
    two: '2',
    modulesCount: (n: number) => `${n}`,
  },
};

export default async function Statistics() {
  const { locale, t } = await getTranslations();
  const settings = await db.getSettings();
  const labels = STAT_LABELS[locale] || STAT_LABELS.uz;

  const moduleCount = ALL_COURSES.reduce((sum, c) => sum + c.modules.length, 0);

  const cards = [
    { 
      value: '1000+', 
      label: labels.subscribers,
      accent: 'text-emerald-400' 
    },
    { 
      value: labels.two, 
      label: labels.tariffs,
      accent: 'text-white' 
    },
    { 
      value: labels.modulesCount(moduleCount), 
      label: labels.modules,
      accent: 'text-white' 
    },
    { 
      value: `${settings.passing_score}%`, 
      label: t('home.statPassing'),
      accent: 'text-pink-400' 
    },
  ];

  return (
    <section className="border-y border-white/[0.08] bg-[#050505]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-white/[0.08] px-0 sm:grid-cols-4 sm:divide-y-0">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col items-center px-4 py-8 text-center group hover:bg-white/[0.015] transition">
            <div className={`mb-1.5 font-mono text-[34px] font-black leading-none tracking-tight sm:text-[42px] ${card.accent}`}>
              {card.value}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
