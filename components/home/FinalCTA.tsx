'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function FinalCTA() {
  const { t } = useI18n();
  return (
    <section className="py-20 lg:py-28 relative bg-[#000000] border-t border-white/10 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-white text-xs font-mono font-bold uppercase tracking-wider mb-6">
          <Sparkles size={13} className="fill-white" />
          {t('home.ctaBadge')}
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-6">
          {t('home.ctaTitle')}
        </h2>

        <p className="text-white/65 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('home.ctaSubtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/courses"
            className="w-full sm:w-auto px-9 py-4 bg-white text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition shadow-2xl flex items-center justify-center gap-2"
          >
            <span>{t('home.ctaPrimary')}</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-sm rounded-xl transition text-center"
          >
            {t('home.ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
