'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { 
  UserPlus, 
  BookOpen, 
  CreditCard, 
  UploadCloud, 
  ShieldCheck, 
  Unlock, 
  PlayCircle, 
  ClipboardCheck, 
  Award, 
  Sparkles 
} from 'lucide-react';

/**
 * The thresholds are supplied by the server page from platform settings, so
 * this banner can never advertise a rule different from the one enforced.
 */
export default function HowItWorks({
  passingScore,
  watchRequirement,
}: {
  passingScore: number;
  watchRequirement: number;
}) {
  const { t } = useI18n();
  const steps = [
    { num: '01', title: t('steps.s1Title'), desc: t('steps.s1Desc'), icon: <UserPlus size={18} /> },
    { num: '02', title: t('steps.s2Title'), desc: t('steps.s2Desc'), icon: <BookOpen size={18} /> },
    { num: '03', title: t('steps.s3Title'), desc: t('steps.s3Desc'), icon: <CreditCard size={18} /> },
    { num: '04', title: t('steps.s4Title'), desc: t('steps.s4Desc'), icon: <UploadCloud size={18} /> },
    { num: '05', title: t('steps.s5Title'), desc: t('steps.s5Desc'), icon: <ShieldCheck size={18} /> },
    { num: '06', title: t('steps.s6Title'), desc: t('steps.s6Desc'), icon: <Unlock size={18} /> },
    { num: '07', title: t('steps.s7Title'), desc: t('steps.s7Desc'), icon: <PlayCircle size={18} /> },
    { num: '08', title: t('steps.s8Title'), desc: t('steps.s8Desc'), icon: <ClipboardCheck size={18} /> },
    { num: '09', title: t('steps.s9Title'), desc: t('steps.s9Desc'), icon: <Award size={18} /> },
    { num: '10', title: t('steps.s10Title'), desc: t('steps.s10Desc'), icon: <Sparkles size={18} /> },
  ];

  return (
    <section className="py-20 lg:py-28 relative bg-[#000000] border-t border-white/10 overflow-hidden" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/80 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            {t('home.howBadge')}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {t('home.howTitle')}
          </h2>
          <p className="text-white/60 text-base sm:text-lg mt-4 leading-relaxed">
            {t('home.howSubtitle')}
          </p>
        </div>

        {/* 10 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="bg-[#0a0a0a] border border-white/15 hover:border-white/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:bg-[#111] group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-white/40 group-hover:text-white transition-colors">
                    STEP {s.num}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
                    {s.icon}
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Passing-score banner */}
        <div className="bg-[#0a0a0a] border border-white/20 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Award size={14} /> {t('home.passBadge', { pass: passingScore })}
            </div>
            <h4 className="text-2xl sm:text-3xl font-black text-white">
              {t('home.passTitle')}
            </h4>
            <p className="text-white/70 text-sm leading-relaxed">
              {t('home.passText', { watch: watchRequirement, pass: passingScore })}
            </p>
          </div>
          <div className="text-center sm:text-right shrink-0 bg-black border border-white/15 px-8 py-6 rounded-2xl">
            <div className="text-4xl sm:text-5xl font-black font-mono text-white">
              {passingScore}%
            </div>
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider mt-1">
              {t('home.passMinLabel')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
