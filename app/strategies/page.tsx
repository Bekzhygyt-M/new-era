'use client';

import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { Target, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';


export default function StrategiesPage() {
  const { t } = useI18n();

  // Inside the component so the copy can be translated; the numbers, tags and
  // timeframes are the strategy's own data and stay as they are.
  const STRATEGIES = [
    { id: '1', title: 'Smart Money Concepts (SMC) & Market Structure', level: 'PRO', winRate: '75%', timeframe: '15M / 1H', tags: ['SMC', 'BOS', 'CHoCH'], desc: t('strategies.s1Desc'), unlocked: true },
    { id: '2', title: 'Order Block (OB) & Fair Value Gap (FVG)', level: 'PRO', winRate: '72%', timeframe: '5M / 15M', tags: ['Order Block', 'FVG', 'Imbalance'], desc: t('strategies.s2Desc'), unlocked: true },
    { id: '3', title: 'London & New York Killzones Sweep Model', level: 'VIP', winRate: '80%', timeframe: '1M / 5M', tags: ['Killzones', 'Liquidity', 'Judas Swing'], desc: t('strategies.s3Desc'), unlocked: true },
    { id: '4', title: 'Prop Firm 1-Phase Challenge Pass Model', level: 'VIP', winRate: '78%', timeframe: '15M', tags: ['Prop Challenge', 'Drawdown Control'], desc: t('strategies.s4Desc'), unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="strategies" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Header */}
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">{t('strategies.title')}</h1>
            <p className="text-xs sm:text-sm text-white/50">{t('strategies.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STRATEGIES.map((s) => (
              <div
                key={s.id}
                className="bg-[#000000] border border-white/15 rounded-3xl p-6 flex flex-col justify-between hover:border-white transition duration-200 shadow-2xl space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-black bg-white px-2.5 py-0.5 rounded-full font-black">
                      {s.level} TRADING
                    </span>
                    <span className="text-xs font-mono font-bold text-white">Win Rate: {s.winRate}</span>
                  </div>

                  <h3 className="text-base font-black text-white mb-2 leading-snug">{s.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed mb-4">{s.desc}</p>

                  <div className="flex flex-wrap gap-1.5 font-mono">
                    {s.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-[#080808] text-[10px] text-white/60 border border-white/10">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono">
                  <span className="text-[11px] text-white/40">{t('strategies.timeframe')} {s.timeframe}</span>
                  {s.unlocked ? (
                    <Link
                      href="/courses"
                      className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-black text-xs rounded-xl transition flex items-center gap-1 uppercase"
                    >
                      {t('strategies.viewLesson')} <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <Link
                      href="/checkout/33333333-3333-3333-3333-333333333333"
                      className="px-4 py-2 bg-white/10 hover:bg-white hover:text-black text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 uppercase"
                    >
                      <Lock size={12} /> {t('strategies.upgradeVip')}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DashboardFooter />
        </div>
      </main>
    </div>
  );
}
