'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Activity, 
  Layers, 
  Target, 
  Brain, 
  ShieldCheck, 
  ChevronRight, 
  Flame,
  LineChart,
  BarChart2
} from 'lucide-react';

import { useI18n, type Locale } from '@/lib/i18n';

interface StrategyContent {
  name: string;
  tag: string;
  badge: string;
  concept: string;
  description: string;
  keyPoints: string[];
}

interface StrategyMeta {
  id: string;
  color: string;
  bgGlow: string;
  borderColor: string;
  icon: React.ReactNode;
  winRate: string;
  rr: string;
}

const STRATEGY_METAS: StrategyMeta[] = [
  {
    id: 'snr',
    color: '#00E676',
    bgGlow: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.35)',
    icon: <BarChart2 size={22} className="text-emerald-400" />,
    winRate: '78%',
    rr: '1:3.2',
  },
  {
    id: 'sms',
    color: '#EC4899',
    bgGlow: 'rgba(236, 72, 153, 0.12)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    icon: <Layers size={22} className="text-pink-400" />,
    winRate: '84%',
    rr: '1:4.5',
  },
  {
    id: 'trading-line',
    color: '#06B6D4',
    bgGlow: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    icon: <LineChart size={22} className="text-cyan-400" />,
    winRate: '75%',
    rr: '1:2.8',
  },
  {
    id: 'fibonacci',
    color: '#A855F7',
    bgGlow: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    icon: <Activity size={22} className="text-purple-400" />,
    winRate: '82%',
    rr: '1:3.8',
  },
  {
    id: 'ict',
    color: '#F43F5E',
    bgGlow: 'rgba(244, 63, 94, 0.14)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    icon: <Zap size={22} className="text-rose-400" />,
    winRate: '86%',
    rr: '1:5.0',
  },
  {
    id: 'individual',
    color: '#F59E0B',
    bgGlow: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: <Target size={22} className="text-amber-400" />,
    winRate: '80%',
    rr: '1:3.5',
  },
  {
    id: 'amd',
    color: '#10B981',
    bgGlow: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: <Sparkles size={22} className="text-emerald-400" />,
    winRate: '85%',
    rr: '1:4.2',
  },
  {
    id: 'classic',
    color: '#60A5FA',
    bgGlow: 'rgba(96, 165, 250, 0.12)',
    borderColor: 'rgba(96, 165, 250, 0.35)',
    icon: <TrendingUp size={22} className="text-blue-400" />,
    winRate: '76%',
    rr: '1:3.0',
  },
  {
    id: 'psychology',
    color: '#FF2E93',
    bgGlow: 'rgba(255, 46, 147, 0.14)',
    borderColor: 'rgba(255, 46, 147, 0.4)',
    icon: <Brain size={22} className="text-pink-500" />,
    winRate: '90%',
    rr: '1:3+',
  },
];

const STRATEGY_DATA: Record<Locale, Record<string, StrategyContent>> = {
  uz: {
    snr: {
      name: 'SNR (Support & Resistance)',
      tag: 'Darajalar Tahlili',
      badge: 'Klassik Asos',
      concept: 'Statik & Dinamik Darajalar',
      description: 'Narxning asosiy qaytish va sinish nuqtalarini aniqlash. Kuchli retest zonalari orqali ishonchli kirish.',
      keyPoints: ['Kuchli retest zonalari', 'Sintez timeframelar', 'Soxta sinishlarni filtrlash'],
    },
    sms: {
      name: 'SMS (Smart Money Structure)',
      tag: 'Bozor Strukturasi',
      badge: 'Institutsional',
      concept: 'BOS & CHoCH Signallari',
      description: 'Bozor strukturasining o‘zgarishi (Change of Character) va davom etishi (Break of Structure) bo‘yicha tahlil.',
      keyPoints: ['Market Structure Shift', 'Likvidlik ovlash joylari', 'Trend davomiyligi'],
    },
    'trading-line': {
      name: 'Trading Line',
      tag: 'Trend Dinamikasi',
      badge: 'Trend Savdosi',
      concept: 'Trend Chiziqlari & Breakout',
      description: 'Kuchli trend chiziqlari bilan ishlash, trenddan chiqish (Breakout) va qayta kirish (Retest) modellarini o‘rganish.',
      keyPoints: ['Diagonal likvidlik', 'Impuls va korreksiya', 'Breakout tasdiqlari'],
    },
    fibonacci: {
      name: 'Fibonacci Strategiyasi',
      tag: 'Korreksiya Chuqurligi',
      badge: 'Matematik Aniqlik',
      concept: 'OTE & Golden Zone (0.618 - 0.786)',
      description: 'Fibonacci darajalari yordamida Optimal Trade Entry (OTE) nuqtalarini aniq hisoblab chiqish.',
      keyPoints: ['Golden Pocket 0.618', 'Discount zonalarda xarid', 'Premium zonalarda sotuv'],
    },
    ict: {
      name: 'ICT (Inner Circle Trader)',
      tag: 'Smart Money & FVG',
      badge: 'Eng Ommabop',
      concept: 'Order Block + Fair Value Gap (FVG)',
      description: 'Banklar va yirik fondlar kabi bozor likvidligini ko‘rish, FVG bo‘shliqlarini to‘ldirish vaqtida bitimga kirish.',
      keyPoints: ['Order Block tasdiqlari', 'Fair Value Gap (FVG)', 'London & NY Killzone'],
    },
    individual: {
      name: 'Individual Strategiya',
      tag: 'Shaxsiy Yondashuv',
      badge: 'Treyder Psixotipi',
      concept: 'Shaxsiy Reja va Savdo Grafigi',
      description: 'Sizning bo‘sh vaqtingiz, depozitingiz va xarakteringizga moslashtirilgan yagona shaxsiy savdo qoidalari to‘plami.',
      keyPoints: ['Shaxsiy savdo soatlari', 'Qat’iy qoidalar to‘plami', 'Emotsional barqarorlik'],
    },
    amd: {
      name: 'AMD Strategiyasi',
      tag: 'Manipulyatsiya Modeli',
      badge: 'Yirik Ishtirokchilar',
      concept: 'Accumulation → Manipulation → Distribution',
      description: 'Judas Swing (soxta impuls) orqali olomonni tuzoqqa tushirib, haqiqiy yo‘nalishga (Distribution) yirik hajm bilan kirish.',
      keyPoints: ['Judas Swing tuzog‘i', 'Likvidlik to‘plash fazasi', 'Kuchli impuls harakati'],
    },
    classic: {
      name: 'Klassik Modellar',
      tag: 'Grafik Shakllari',
      badge: 'Texnik Tahlil',
      concept: 'Double Top/Bottom & Head & Shoulders',
      description: 'Asrlar davomida sinalgan narx modellari: Flags, Pennants, Triangles va Bosh-Yelka shakllarining zamonaviy talqini.',
      keyPoints: ['Model tasdiqlanishi', 'Target narx hisobi', 'Bozor fraktalligi'],
    },
    psychology: {
      name: 'Psixologiya & Risk Menejment',
      tag: 'Intizom & Himoya',
      badge: 'Muvaffaqiyat Kaliti',
      concept: 'Trading Jurnal + Emotsiyalarni Boshqarish',
      description: 'FOMO, qo‘rquv va ochko‘zlikni yengish. Har bir bitimni qayd etib, kapitalni xavfsiz boshqarish tizimi.',
      keyPoints: ['Trading jurnal yuritish', 'Har savdoda 1% risk', 'Intizomli fikrlash'],
    },
  },
  ru: {
    snr: {
      name: 'SNR (Support & Resistance)',
      tag: 'Анализ Уровней',
      badge: 'Классическая База',
      concept: 'Статические и динамические уровни',
      description: 'Определение ключевых зон разворота и пробоя цены. Вход на подтвержденном ретесте с минимальным стоп-лоссом.',
      keyPoints: ['Зоны сильного ретеста', 'Синтез таймфреймов', 'Фильтрация ложных пробоев'],
    },
    sms: {
      name: 'SMS (Smart Money Structure)',
      tag: 'Структура Рынка',
      badge: 'Институциональный',
      concept: 'Сигналы BOS и CHoCH',
      description: 'Анализ смены характера рынка (Change of Character) и подтвержденного продолжения тренда (Break of Structure).',
      keyPoints: ['Market Structure Shift', 'Зоны снятия ликвидности', 'Следование тренду институтов'],
    },
    'trading-line': {
      name: 'Trading Line',
      tag: 'Динамика Тренда',
      badge: 'Трендовая Торговля',
      concept: 'Трендовые линии и Breakout',
      description: 'Работа с динамическими наклонными уровнями, отработка истинных пробоев (Breakout) и безопасный вход на ретесте.',
      keyPoints: ['Диагональная ликвидность', 'Импульс и коррекция', 'Подтверждение пробоя'],
    },
    fibonacci: {
      name: 'Стратегия Фибоначчи',
      tag: 'Глубина Коррекции',
      badge: 'Математическая Точность',
      concept: 'OTE и Золотая Зона (0.618 - 0.786)',
      description: 'Точный математический расчет точек Optimal Trade Entry (OTE) с максимальным потенциалом прибыли.',
      keyPoints: ['Golden Pocket 0.618', 'Покупки в Discount зонах', 'Продажи в Premium зонах'],
    },
    ict: {
      name: 'ICT (Inner Circle Trader)',
      tag: 'Smart Money & FVG',
      badge: 'Популярная Концепция',
      concept: 'Order Block + Fair Value Gap (FVG)',
      description: 'Чтение рыночной ликвидности вместе с банками и фондами, вход на заполнении дисбалансов (FVG) и тест ордерблоков.',
      keyPoints: ['Ордерблоки и подтверждения', 'Fair Value Gap (FVG)', 'Сессии London & NY Killzone'],
    },
    individual: {
      name: 'Индивидуальная Стратегия',
      tag: 'Персональный Подход',
      badge: 'Психотип Трейдера',
      concept: 'Торговый план под образ жизни',
      description: 'Свод торговых правил, адаптированный под ваш депозит, график работы и индивидуальный психотип.',
      keyPoints: ['Персональные торговые часы', 'Четкий чек-лист на вход', 'Эмоциональный контроль'],
    },
    amd: {
      name: 'Стратегия AMD',
      tag: 'Модель Манипуляций',
      badge: 'Крупные Игроки',
      concept: 'Accumulation → Manipulation → Distribution',
      description: 'Определение фазы накопления, вынос толпы через ложный импульс (Judas Swing) и вход в истинное распределение.',
      keyPoints: ['Ловушка Judas Swing', 'Фаза накопления объема', 'Импульсная дистрибуция'],
    },
    classic: {
      name: 'Классические Паттерны',
      tag: 'Фигуры Графика',
      badge: 'Технический Анализ',
      concept: 'Double Top/Bottom и Head & Shoulders',
      description: 'Проверенные временем паттерны: флаги, вымпелы, клинья и фигура Голова и Плечи с современными фильтрами объема.',
      keyPoints: ['Подтверждение паттерна', 'Расчет тейк-профита', 'Фрактальность рынка'],
    },
    psychology: {
      name: 'Психология и Риск-Менеджмент',
      tag: 'Дисциплина и Защита',
      badge: 'Ключ к Успеху',
      concept: 'Торговый журнал + Контроль эмоций',
      description: 'Преодоление страха, жадности и синдрома упущенной выгоды (FOMO). Система строгой защиты депозита.',
      keyPoints: ['Ведение торгового журнала', 'Фиксированный риск 1%', 'Психологическая дисциплина'],
    },
  },
  en: {
    snr: {
      name: 'SNR (Support & Resistance)',
      tag: 'Level Analysis',
      badge: 'Classical Foundation',
      concept: 'Static & Dynamic Key Levels',
      description: 'Locating primary rejection and breakout price levels. Entering safely on verified retest zones.',
      keyPoints: ['Strong retest zones', 'Multi-timeframe synthesis', 'False breakout filters'],
    },
    sms: {
      name: 'SMS (Smart Money Structure)',
      tag: 'Market Structure',
      badge: 'Institutional',
      concept: 'BOS & CHoCH Signatures',
      description: 'Tracking Change of Character (CHoCH) shifts and Break of Structure (BOS) continuations for institutional alignment.',
      keyPoints: ['Market Structure Shift', 'Liquidity pools target', 'Trend persistence'],
    },
    'trading-line': {
      name: 'Trading Line',
      tag: 'Trend Dynamics',
      badge: 'Trend Trading',
      concept: 'Trendlines & Breakouts',
      description: 'Trading institutional diagonal trendlines, breakout validations, and high-probability retest entries.',
      keyPoints: ['Diagonal liquidity', 'Impulse vs correction', 'Breakout confirmations'],
    },
    fibonacci: {
      name: 'Fibonacci Strategy',
      tag: 'Retracement Depth',
      badge: 'Mathematical Edge',
      concept: 'OTE & Golden Zone (0.618 - 0.786)',
      description: 'Pinpointing high-precision Optimal Trade Entry (OTE) points inside institutional discount and premium zones.',
      keyPoints: ['Golden Pocket 0.618', 'Discount zone buying', 'Premium zone selling'],
    },
    ict: {
      name: 'ICT (Inner Circle Trader)',
      tag: 'Smart Money & FVG',
      badge: 'Institutional Benchmark',
      concept: 'Order Block + Fair Value Gap (FVG)',
      description: 'Reading liquidity alongside major market makers, entering on Fair Value Gap fill and mitigation order blocks.',
      keyPoints: ['Order Block confirmation', 'Fair Value Gap (FVG)', 'London & NY Killzones'],
    },
    individual: {
      name: 'Individual Strategy',
      tag: 'Tailored Edge',
      badge: 'Trader Psychotype',
      concept: 'Personalized Trading Framework',
      description: 'Custom trading playbook calibrated precisely to your capital, available trading hours, and psychological profile.',
      keyPoints: ['Personal trading windows', 'Strict entry checklist', 'Emotional consistency'],
    },
    amd: {
      name: 'AMD Strategy',
      tag: 'Manipulation Cycle',
      badge: 'Smart Money Cycle',
      concept: 'Accumulation → Manipulation → Distribution',
      description: 'Spotting Asian range accumulation, false Judas Swing manipulation sweeps, and riding high-velocity distribution runs.',
      keyPoints: ['Judas Swing trap', 'Accumulation range', 'High-velocity distribution'],
    },
    classic: {
      name: 'Classical Patterns',
      tag: 'Chart Formations',
      badge: 'Technical Analysis',
      concept: 'Double Top/Bottom & Head & Shoulders',
      description: 'Time-tested geometric chart formations: flags, pennants, wedges, and Head & Shoulders with modern volume filters.',
      keyPoints: ['Pattern confirmation', 'Measured target projection', 'Market fractality'],
    },
    psychology: {
      name: 'Psychology & Risk Control',
      tag: 'Discipline & Protection',
      badge: 'Key to Longevity',
      concept: 'Trading Journal + Mindset Control',
      description: 'Conquering FOMO, fear, and greed. Establishing bulletproof capital preservation rules and emotional stability.',
      keyPoints: ['Trading journal habit', 'Strict 1% risk rule', 'Disciplined execution'],
    },
  },
};

const SHOWCASE_I18N = {
  uz: {
    badge: 'Amaliy Strategiyalar',
    titleMain: 'Bozorda Ishlaydigan',
    titleAccent: 'Professional Strategiyalar',
    sub: 'Standart va Pro kurslarimizda o‘rgatiladigan eng kuchli savdo modellari. Har bir dars amaliy chart misollari bilan tushuntiriladi.',
    active: 'Aktiv',
    conceptLabel: 'STRATEGIYA KONSEPTI',
    winRateLabel: 'STATISTIK WIN RATE',
    winRateSub: 'O‘rtacha sinov natijasi',
    rrLabel: 'RISK / REWARD NISBATI',
    rrSub: 'Minimal target maqsadi',
    autoRotating: 'Avtomatik aylanmoqda',
  },
  ru: {
    badge: 'Практические Стратегии',
    titleMain: 'Работающие на Рынке',
    titleAccent: 'Профессиональные Стратегии',
    sub: 'Самые эффективные торговые модели, изучаемые в курсах Standart и Pro. Каждый урок сопровождается разбором реальных графиков.',
    active: 'Активно',
    conceptLabel: 'КОНЦЕПТ СТРАТЕГИИ',
    winRateLabel: 'СТАТИСТИЧЕСКИЙ ВИНРЕЙТ',
    winRateSub: 'Средний результат тестов',
    rrLabel: 'СООТНОШЕНИЕ RISK / REWARD',
    rrSub: 'Минимальная цель тейк-профита',
    autoRotating: 'Авто-ротация',
  },
  en: {
    badge: 'Practical Strategies',
    titleMain: 'High-Probability',
    titleAccent: 'Professional Strategies',
    sub: 'The most powerful trading frameworks taught in our Standard & Pro courses. Every lesson is explained with live chart case studies.',
    active: 'Active',
    conceptLabel: 'STRATEGY CONCEPT',
    winRateLabel: 'STATISTICAL WIN RATE',
    winRateSub: 'Historical backtest average',
    rrLabel: 'RISK / REWARD RATIO',
    rrSub: 'Minimum target objective',
    autoRotating: 'Auto-rotating',
  },
};

export default function StrategyShowcase() {
  const { locale } = useI18n();
  const texts = SHOWCASE_I18N[locale] || SHOWCASE_I18N.uz;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const strategies = React.useMemo(() => {
    const contentMap = STRATEGY_DATA[locale] || STRATEGY_DATA.uz;
    return STRATEGY_METAS.map((meta) => {
      const content = contentMap[meta.id] || STRATEGY_DATA.uz[meta.id];
      return {
        ...meta,
        ...content,
      };
    });
  }, [locale]);

  // Auto-rotating timer: advances every 3.5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % strategies.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused, strategies.length]);

  const activeStrategy = strategies[activeIndex] || strategies[0];

  return (
    <section className="relative py-20 lg:py-28 bg-[#050505] border-t border-white/10 overflow-hidden" id="strategies">
      {/* Background glow matching active strategy color */}
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-25 transition-all duration-700"
        style={{ background: activeStrategy.color }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            <Flame size={14} className="animate-pulse" />
            {texts.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {texts.titleMain}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-white to-emerald-400">
              {texts.titleAccent}
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/55 leading-relaxed">
            {texts.sub}
          </p>
        </div>

        {/* ── Auto-rotating Selector Strip ── */}
        <div 
          className="mb-10 overflow-x-auto pb-4 scrollbar-none flex items-center gap-2.5 sm:justify-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {strategies.map((strat, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={strat.id}
                onClick={() => setActiveIndex(idx)}
                className={`relative shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-black border-white shadow-lg scale-105 font-black'
                    : 'bg-[#0e0e0e] text-white/70 border-white/10 hover:border-white/25 hover:text-white'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: isActive ? '#000000' : strat.color }} 
                />
                <span>{strat.name.split(' ')[0]}</span>
                {isActive && (
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/10 font-black">
                    {texts.active}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Active Spotlight Card ── */}
        <div 
          className="relative rounded-3xl border bg-[#0b0b0d] p-6 sm:p-10 shadow-2xl transition-all duration-500 overflow-hidden"
          style={{ borderColor: activeStrategy.borderColor }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Subtle top indicator bar */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 transition-all duration-500"
            style={{ backgroundColor: activeStrategy.color }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStrategy.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="grid gap-8 lg:grid-cols-12 items-center"
            >
              {/* Left Details */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border"
                    style={{ 
                      color: activeStrategy.color, 
                      backgroundColor: activeStrategy.bgGlow,
                      borderColor: activeStrategy.borderColor 
                    }}
                  >
                    {activeStrategy.badge}
                  </span>
                  <span className="text-xs font-mono text-white/40 font-bold uppercase tracking-wider">
                    {activeStrategy.tag}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0"
                    style={{ 
                      backgroundColor: activeStrategy.bgGlow, 
                      borderColor: activeStrategy.borderColor 
                    }}
                  >
                    {activeStrategy.icon}
                  </div>
                  {activeStrategy.name}
                </h3>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl">
                  {activeStrategy.description}
                </p>

                {/* Key Points */}
                <div className="grid sm:grid-cols-3 gap-3 pt-2">
                  {activeStrategy.keyPoints.map((pt, i) => (
                    <div 
                      key={i} 
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-2 text-xs font-semibold text-white/80"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeStrategy.color }} />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Metrics & Visual Indicator */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#121216] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">
                        {texts.conceptLabel}
                      </span>
                      <span className="text-sm font-black text-white">
                        {activeStrategy.concept}
                      </span>
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full animate-ping"
                      style={{ backgroundColor: activeStrategy.color }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                      <span className="text-[10px] font-mono text-white/40 uppercase block">
                        {texts.winRateLabel}
                      </span>
                      <span className="text-2xl font-black font-mono mt-1 block text-emerald-400">
                        {activeStrategy.winRate}
                      </span>
                      <span className="text-[10px] text-white/30">{texts.winRateSub}</span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/50 p-4">
                      <span className="text-[10px] font-mono text-white/40 uppercase block">
                        {texts.rrLabel}
                      </span>
                      <span className="text-2xl font-black font-mono mt-1 block text-pink-400">
                        {activeStrategy.rr}
                      </span>
                      <span className="text-[10px] text-white/30">{texts.rrSub}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs font-mono text-white/50">
                    <span>{texts.autoRotating}</span>
                    <span className="text-white font-bold">
                      {activeIndex + 1} / {strategies.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
