'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Video, Target, Award, Headset } from 'lucide-react';
import MarketChart from './MarketChart';
import PaymentMethodsMarquee from './PaymentMethodsMarquee';
import { useI18n } from '@/lib/i18n';

/**
 * Hero section (TZ §4.1).
 *
 * The headline is the first thing on screen: large, white, unmissable —
 * "0 DAN PROFESSIONAL DARAJAGACHA TRADING DARSLIKLARI".
 */
export default function Hero() {
  const { locale } = useI18n();

  const copy = {
    uz: {
      eyebrow: "Ta'lim platformasi",
      subscribers: '1000+ Obunachilar',
      headlineTop: '0 DAN PROFESSIONAL DARAJAGACHA',
      headlineBottom: 'TRADING DARSLIKLARI',
      sub: 'Video dars → qisqacha xulosa → test → 90% natija → keyingi dars. Har bir bosqich tekshiriladi, hech narsa tasodifan ochilmaydi.',
      primary: 'Kurslarni ko‘rish',
      secondary: 'Boshlash',
      badges: ['Video darslar', 'Amaliy strategiyalar', 'Test va XP tizimi', "24/7 qo‘llab-quvvatlash"],
      disclaimer:
        '⚠️ Ushbu video darsliklarni noqonuniy tarqatgan shaxs qonunchilikka muvofiq javobgarlikka tortiladi. Barcha mualliflik huquqlari himoyalangan.',
    },
    ru: {
      eyebrow: 'Образовательная платформа',
      subscribers: '1000+ Подписчиков',
      headlineTop: 'С НУЛЯ ДО ПРОФЕССИОНАЛЬНОГО УРОВНЯ',
      headlineBottom: 'УРОКИ ТРЕЙДИНГА',
      sub: 'Видеоурок → конспект → тест → результат 90% → следующий урок. Каждый этап проверяется, ничего не открывается случайно.',
      primary: 'Смотреть курсы',
      secondary: 'Начать',
      badges: ['Видеоуроки', 'Практические стратегии', 'Тесты и XP', 'Поддержка 24/7'],
      disclaimer:
        '⚠️ Лица, незаконно распространяющие данные видеоуроки, привлекаются к ответственности в соответствии с законодательством. Все авторские права защищены.',
    },
    en: {
      eyebrow: 'Education platform',
      subscribers: '1000+ Subscribers',
      headlineTop: 'FROM ZERO TO PROFESSIONAL',
      headlineBottom: 'TRADING LESSONS',
      sub: 'Video lesson → summary → test → 90% score → next lesson. Every step is verified; nothing unlocks by accident.',
      primary: 'Browse courses',
      secondary: 'Get started',
      badges: ['Video lessons', 'Practical strategies', 'Tests & XP system', '24/7 support'],
      disclaimer:
        '⚠️ Any unauthorized distribution of these video tutorials will be prosecuted to the full extent of the law. All rights reserved.',
    },
  }[locale];

  const badgeIcons = [Video, Target, Award, Headset];

  return (
    <section id="home" className="relative flex min-h-screen flex-col overflow-hidden bg-black pt-16">
      {/* Backdrop: grid + restrained glows. No neon, no casino gradients. */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
      <div
        className="pointer-events-none absolute left-[-8%] top-[12%] h-[520px] w-[520px]"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute right-[-8%] top-[8%] h-[520px] w-[520px]"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* ── Copy ── */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                {copy.eyebrow}
              </span>
              <span className="mx-1 h-3 w-px bg-white/20" />
              <span className="text-[10.5px] font-mono font-bold text-pink-400">
                {copy.subscribers}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-[2.1rem] font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl lg:text-[4.25rem] xl:text-[4.75rem]"
            >
              <span className="block">{copy.headlineTop}</span>
              <span className="block text-white/95">{copy.headlineBottom}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base"
            >
              {copy.sub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/courses"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-black uppercase tracking-wider text-black transition hover:bg-white/90"
              >
                {copy.primary}
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.03] px-7 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:border-white/40 hover:bg-white/[0.07]"
              >
                {copy.secondary}
              </Link>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:max-w-lg"
            >
              {copy.badges.map((text, index) => {
                const Icon = badgeIcons[index];
                return (
                  <li key={text} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                      <Icon size={14} className="text-white/70" />
                    </span>
                    <span className="text-xs font-semibold text-white/65">{text}</span>
                  </li>
                );
              })}
            </motion.ul>

            {/* TZ §32 — the disclaimer sits in the first screen, not buried. */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-8 max-w-xl border-l-2 border-white/10 pl-3 text-[11px] leading-relaxed text-white/30"
            >
              {copy.disclaimer}
            </motion.p>
          </div>

          {/* ── Chart ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <MarketChart />
          </motion.div>
        </div>
      </div>

      <PaymentMethodsMarquee />
    </section>
  );
}
