'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import { 
  Globe, 
  Building2, 
  Monitor, 
  Clock, 
  Newspaper, 
  BarChart3, 
  ShieldCheck, 
  Briefcase, 
  TrendingUp, 
  Gem, 
  Target, 
  Brain, 
  LineChart, 
  TestTube 
} from 'lucide-react';

interface TopicItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
}

export default function WhatYouLearn() {
  const { t } = useI18n();
  const topics: TopicItem[] = [
    {
      icon: <Globe className="text-white" size={22} />,
      title: t('learn.card1Title'),
      desc: t('learn.card1Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <Building2 className="text-white" size={22} />,
      title: t('learn.card2Title'),
      desc: t('learn.card2Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <Monitor className="text-white" size={22} />,
      title: t('learn.card3Title'),
      desc: t('learn.card3Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <Clock className="text-white" size={22} />,
      title: t('learn.card4Title'),
      desc: t('learn.card4Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <Newspaper className="text-white" size={22} />,
      title: t('learn.card5Title'),
      desc: t('learn.card5Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <BarChart3 className="text-white" size={22} />,
      title: t('learn.card6Title'),
      desc: t('learn.card6Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <ShieldCheck className="text-white" size={22} />,
      title: t('learn.card7Title'),
      desc: t('learn.card7Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <Briefcase className="text-white" size={22} />,
      title: t('learn.card8Title'),
      desc: t('learn.card8Desc'),
      badge: 'STANDARD',
    },
    {
      icon: <TrendingUp className="text-white" size={22} />,
      title: t('learn.card9Title'),
      desc: t('learn.card9Desc'),
      badge: 'PRO',
    },
    {
      icon: <Gem className="text-white" size={22} />,
      title: t('learn.card10Title'),
      desc: t('learn.card10Desc'),
      badge: 'PRO',
    },
    {
      icon: <Target className="text-white" size={22} />,
      title: t('learn.card11Title'),
      desc: t('learn.card11Desc'),
      badge: 'PRO',
    },
    {
      icon: <Brain className="text-white" size={22} />,
      title: t('learn.card12Title'),
      desc: t('learn.card12Desc'),
      badge: 'PRO',
    },
    {
      icon: <LineChart className="text-white" size={22} />,
      title: t('learn.card13Title'),
      desc: t('learn.card13Desc'),
      badge: 'PRO',
    },
    {
      icon: <TestTube className="text-white" size={22} />,
      title: t('learn.card14Title'),
      desc: t('learn.card14Desc'),
      badge: 'PRO',
    },
  ];

  return (
    <section className="py-20 lg:py-28 relative bg-[#000000] border-t border-white/10" id="curriculum">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/80 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            {t('home.learnBadge')}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {t('home.learnTitle')}
          </h2>
          <p className="text-white/60 text-base sm:text-lg mt-4 leading-relaxed">
            {t('home.learnSubtitle')}
          </p>
        </div>

        {/* 14 Topic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {topics.map((t, idx) => (
            <div
              key={idx}
              className="bg-[#0a0a0a] border border-white/15 hover:border-white/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:bg-[#111111] group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    {t.icon}
                  </div>
                  {t.badge && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-white/20 bg-white/5 text-white/80">
                      {t.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-2 tracking-tight group-hover:text-white transition-colors">
                  {t.title}
                </h3>

                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  {t.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
