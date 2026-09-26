'use client';

import Link from 'next/link';
import {
  Users,
  Target,
  CheckCircle2,
  ArrowRight,
  LineChart,
  MessageSquare,
  Flame,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { useI18n } from '@/lib/i18n';

export default function MentorshipPage() {
  const { t } = useI18n();

  const tiers = [
    {
      name: t('mentorship.tier1Name'),
      tag: t('mentorship.tier1Tag'),
      description: t('mentorship.tier1Desc'),
      price: '2,500,000 UZS',
      period: t('mentorship.period'),
      features: [
        t('mentorship.tier1F1'),
        t('mentorship.tier1F2'),
        t('mentorship.tier1F3'),
        t('mentorship.tier1F4'),
        t('mentorship.tier1F5'),
        t('mentorship.tier1F6'),
      ],
      cta: t('mentorship.tier1Cta'),
      highlighted: true,
      badge: t('mentorship.tier1Badge'),
    },
    {
      name: t('mentorship.tier2Name'),
      tag: t('mentorship.tier2Tag'),
      description: t('mentorship.tier2Desc'),
      price: '7,500,000 UZS',
      period: t('mentorship.period'),
      features: [
        t('mentorship.tier2F1'),
        t('mentorship.tier2F2'),
        t('mentorship.tier2F3'),
        t('mentorship.tier2F4'),
        t('mentorship.tier2F5'),
        t('mentorship.tier2F6'),
      ],
      cta: t('mentorship.tier2Cta'),
      highlighted: false,
      badge: t('mentorship.tier2Badge'),
    },
  ];

  const highlights = [
    { icon: LineChart, title: t('mentorship.h1Title'), desc: t('mentorship.h1Desc') },
    { icon: Target, title: t('mentorship.h2Title'), desc: t('mentorship.h2Desc') },
    { icon: MessageSquare, title: t('mentorship.h3Title'), desc: t('mentorship.h3Desc') },
    { icon: Flame, title: t('mentorship.h4Title'), desc: t('mentorship.h4Desc') },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between">
      <Navbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-6xl mx-auto space-y-20">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider font-mono">
              <Sparkles size={14} />
              {t('mentorship.badge')}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              {t('mentorship.heroTitle1')} <br />
              <span className="text-white">{t('mentorship.heroTitle2')}</span>
            </h1>

            <p className="text-white/60 text-base sm:text-lg leading-relaxed">
              {t('mentorship.heroSubtitle')}
            </p>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {highlights.map((h, i) => {
              const Icon = h.icon;
              return (
                <div key={i} className="bg-[#000000] border border-white/10 rounded-3xl p-6 hover:border-white/30 transition duration-300 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-white font-black text-base mb-2">{h.title}</h3>
                  <p className="text-white/50 text-xs leading-relaxed">{h.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {tiers.map((tier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-3xl p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl ${
                  tier.highlighted
                    ? 'bg-[#000000] border-2 border-white'
                    : 'bg-[#000000] border border-white/15'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 right-0 bg-white text-black font-black text-[10px] px-4 py-1.5 uppercase tracking-widest rounded-bl-xl font-mono">
                    {tier.badge}
                  </div>
                )}

                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/50 font-bold block mb-2">
                    {tier.tag}
                  </span>
                  <h3 className="text-2xl font-black text-white mb-2">{tier.name}</h3>
                  <p className="text-white/60 text-xs mb-6">{tier.description}</p>

                  <div className="flex items-baseline gap-2 pb-6 mb-6 border-b border-white/10">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono">{tier.price}</span>
                    <span className="text-white/40 text-xs font-mono">{tier.period}</span>
                  </div>

                  <div className="space-y-3 mb-8">
                    {tier.features.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-3 text-xs text-white/80">
                        <CheckCircle2 size={16} className="text-white flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href="/courses"
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xl ${
                    tier.highlighted
                      ? 'bg-white hover:bg-neutral-200 text-black'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA Banner */}
          <div className="bg-[#000000] border border-white/20 rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-2xl space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white">{t('mentorship.ctaTitle')}</h2>
            <p className="text-white/60 text-sm max-w-md mx-auto">{t('mentorship.ctaBody')}</p>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl"
            >
              <Users size={16} />
              <span>{t('mentorship.ctaButton')}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
