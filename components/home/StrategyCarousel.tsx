'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Zap, Target, Award, Layers, ShieldCheck, Activity } from 'lucide-react';

interface StrategyItem {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  description: string;
  accentGradient: string;
  borderGlow: string;
  badgeBg: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  features: string[];
}

const STRATEGIES: StrategyItem[] = [
  {
    id: 'klassik',
    title: 'Klassik Modellar',
    badge: 'KLASSIKA',
    tagline: 'Grafik patternlar va texnik tahlil',
    description: 'Double Top/Bottom, Head & Shoulders hamda Breakout & Retest modellari orqali aniq burilish nuqtalarini aniqlash.',
    accentGradient: 'from-pink-500/20 via-purple-500/10 to-transparent',
    borderGlow: 'border-pink-500/40 shadow-pink-500/10',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    icon: Layers,
    features: ['Double Top / Bottom', 'Head & Shoulders', 'Breakout & Retest'],
  },
  {
    id: 'snr',
    title: 'SNR (Support & Resistance)',
    badge: 'KEY LEVELS',
    tagline: 'Qo‘llab-quvvatlash va qarshilik darajalari',
    description: 'Bozorning eng muhim kalit darajalarini (Key Levels) va dinamik SNR zonalarini topish usuli.',
    accentGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderGlow: 'border-emerald-500/40 shadow-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Target,
    features: ['Key Price Levels', 'Dynamic SNR', 'Rejection Spots'],
  },
  {
    id: 'sms',
    title: 'SMS (Market Structure)',
    badge: 'STRUCTURE',
    tagline: 'Shift in Market Structure',
    description: 'Bozor strukturasi o‘zgarishi (BOS, CHoCH) va trend yo‘nalishini barvaqt aniqlash modeli.',
    accentGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    borderGlow: 'border-cyan-500/40 shadow-cyan-500/10',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: Activity,
    features: ['BOS (Break of Structure)', 'CHoCH (Change of Character)', 'Trend Identification'],
  },
  {
    id: 'trading-line',
    title: 'Trading Line',
    badge: 'TRENDLINE',
    tagline: 'Trend chiziqlari va breakoutlar',
    description: 'Trend chizig‘i buzilishi va likvidlik to‘plangan kanallarni professional tahlil qilish.',
    accentGradient: 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
    borderGlow: 'border-violet-500/40 shadow-violet-500/10',
    badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    icon: TrendingUp,
    features: ['Trend Channel', 'Breakout Confirmation', 'Liquidity Lines'],
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Strategiyasi',
    badge: 'OTE 0.618 - 0.786',
    tagline: 'Golden Ratio darajalari',
    description: 'OTE (Optimal Trade Entry) zonasi va oltin nisbat orqali eng minimal Stop Loss bilan kirish.',
    accentGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderGlow: 'border-amber-500/40 shadow-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Zap,
    features: ['Fibonacci Retracement', 'OTE Zone (61.8% - 78.6%)', 'Extension Targets'],
  },
  {
    id: 'ict',
    title: 'ICT Strategiyasi',
    badge: 'SMART MONEY',
    tagline: 'Inner Circle Trader Advanced',
    description: 'Order Block, Fair Value Gap (FVG), Killzone va Liquidity Sweep tushunchalari bilan savdo qilish.',
    accentGradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
    borderGlow: 'border-rose-500/40 shadow-rose-500/10',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: Sparkles,
    features: ['Fair Value Gap (FVG)', 'Order Block & Breaker', 'Killzones & Liquidity Grab'],
  },
  {
    id: 'individual',
    title: 'Individual Strategiya',
    badge: 'PERSONAL',
    tagline: 'Shaxsiy moslashtirilgan plan',
    description: 'Trederning shaxsiy ish tartibiga moslashtirilgan kirish filtr va risk menejment tizimi.',
    accentGradient: 'from-emerald-500/20 via-lime-500/10 to-transparent',
    borderGlow: 'border-emerald-400/40 shadow-emerald-400/10',
    badgeBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    icon: Award,
    features: ['Tailored Entry Rules', 'Personal Risk Profile', 'Backtested Edge'],
  },
  {
    id: 'amd',
    title: 'AMD Strategiyasi',
    badge: 'POWER OF 3',
    tagline: 'Accumulation · Manipulation · Distribution',
    description: 'Bozordagi tuzoqlarni oldindan ko‘rib, institutsional treyderlar bilan birga pozitsiya ochish.',
    accentGradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    borderGlow: 'border-purple-400/40 shadow-purple-400/10',
    badgeBg: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
    icon: ShieldCheck,
    features: ['Accumulation (Yig‘ilish)', 'Manipulation (Tuzoq)', 'Distribution (Harakat)'],
  },
];

export default function StrategyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STRATEGIES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPaused]);

  const current = STRATEGIES[activeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % STRATEGIES.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + STRATEGIES.length) % STRATEGIES.length);
  };

  return (
    <section className="border-t border-white/[0.08] bg-[#040404] py-16 sm:py-20 relative overflow-hidden select-none">
      {/* Glow backgrounds */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -translate-y-1/2 h-80 w-80 bg-pink-500/10 blur-[100px] rounded-full" />
      <div className="pointer-events-none absolute right-1/4 top-1/2 -translate-y-1/2 h-80 w-80 bg-emerald-500/10 blur-[100px] rounded-full" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8 relative z-10">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-bold text-pink-400 uppercase tracking-widest mb-3 font-mono">
            <Sparkles size={13} className="text-pink-400 animate-pulse" /> PRO STRATEGIYALAR REKLAMASI
          </div>
          <h2 className="text-2.5xl sm:text-4xl font-black tracking-tight text-white">
            Avtomatik Aylanuvchi <span className="bg-gradient-to-r from-pink-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">Professional Strategiyalar</span>
          </h2>
          <p className="mt-2 text-sm font-semibold text-white/55 max-w-xl mx-auto">
            PRO kursimizda birin-ketin chuqur o‘rgatiladigan har bir strategiya real chartlarda amaliyot bilan beriladi.
          </p>
        </header>

        {/* Carousel Showcase Box */}
        <div 
          className="relative max-w-4xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.96, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: -20 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={`relative rounded-3xl border bg-gradient-to-b ${current.accentGradient} bg-[#0a0a0a]/90 backdrop-blur-xl p-7 sm:p-10 shadow-2xl transition-all duration-500 ${current.borderGlow}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-black border uppercase tracking-wider ${current.badgeBg}`}>
                      {current.badge}
                    </span>
                    <span className="text-xs font-mono text-white/40">
                      0{activeIndex + 1} / 0{STRATEGIES.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                      <current.icon size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {current.title}
                      </h3>
                      <p className="text-xs font-semibold text-white/60">
                        {current.tagline}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-white/75 max-w-xl">
                    {current.description}
                  </p>

                  <div className="pt-2 flex flex-wrap gap-2">
                    {current.features.map((feat) => (
                      <span key={feat} className="text-[11px] font-mono font-bold text-white/90 bg-white/10 border border-white/15 px-3 py-1 rounded-xl">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual Chart Accent Card */}
                <div className="w-full md:w-64 bg-black/60 border border-white/15 rounded-2xl p-4 text-center font-mono space-y-3 shrink-0 shadow-lg">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    REKLAMA KARTASI
                  </div>
                  <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1.5">
                    <TrendingUp size={18} /> LIVE SIGNAL
                  </div>
                  <div className="h-16 w-full rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center p-2">
                    <span className="text-[11px] text-white/90 font-bold tracking-wider">
                      {current.title.toUpperCase()} · READY
                    </span>
                  </div>
                  <div className="text-[10.5px] text-white/50">
                    Avtomatik aylanuvchi modul
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-[-20px] sm:left-[-24px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-xl z-20"
            aria-label="Oldingi strategiya"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-[-20px] sm:right-[-24px] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-xl z-20"
            aria-label="Keyingi strategiya"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots Indicator */}
          <div className="mt-7 flex items-center justify-center gap-2">
            {STRATEGIES.map((st, idx) => (
              <button
                key={st.id}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? 'w-8 bg-gradient-to-r from-pink-400 to-emerald-400'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Strategiya ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
