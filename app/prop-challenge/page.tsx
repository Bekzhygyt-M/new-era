'use client';

import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { Trophy, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';


export default function PropChallengePage() {
  const { t } = useI18n();

  // Inside the component so the rules can be translated; firm names, fees and
  // thresholds are each firm's own published terms.
  const PROP_FIRMS = [
    { id: '1', name: 'FTMO ($10k - $200k)', fee: t('propChallenge.from', { n: '€155' }), targetPhase1: '10%', targetPhase2: '5%', maxDailyLoss: '5%', maxTotalLoss: '10%', payout: '80% - 90%', rules: [t('propChallenge.p1r1'), t('propChallenge.p1r2'), t('propChallenge.p1r3')] },
    { id: '2', name: 'Funding Pips ($5k - $100k)', fee: t('propChallenge.from', { n: '$32' }), targetPhase1: '8%', targetPhase2: '5%', maxDailyLoss: '5%', maxTotalLoss: '10%', payout: '80% - 95%', rules: [t('propChallenge.p2r1'), t('propChallenge.p2r2'), t('propChallenge.p2r3')] },
    { id: '3', name: 'The Funded Trader ($25k - $400k)', fee: t('propChallenge.from', { n: '$189' }), targetPhase1: '8%', targetPhase2: '5%', maxDailyLoss: '5%', maxTotalLoss: '12%', payout: '80% - 90%', rules: [t('propChallenge.p3r1'), t('propChallenge.p3r2'), t('propChallenge.p3r3')] },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="prop-challenge" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Header */}
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">{t('propChallenge.title')}</h1>
            <p className="text-xs sm:text-sm text-white/50">{t('propChallenge.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PROP_FIRMS.map((p) => (
              <div
                key={p.id}
                className="bg-[#000000] border border-white/15 rounded-3xl p-6 flex flex-col justify-between hover:border-white transition duration-200 shadow-2xl space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-black bg-white px-2.5 py-0.5 rounded-full flex items-center gap-1 font-black">
                      <Trophy size={11} /> Funded Account
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{t('propChallenge.payout')} {p.payout}</span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-3 font-mono">{p.name}</h3>

                  <div className="grid grid-cols-2 gap-2 bg-[#080808] border border-white/10 rounded-2xl p-3 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-white/40 block font-mono">{t('propChallenge.phase1Target')}</span>
                      <span className="font-bold text-white font-mono">{p.targetPhase1}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 block font-mono">{t('propChallenge.maxDrawdown')}</span>
                      <span className="font-bold text-white font-mono">{p.maxTotalLoss}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {p.rules.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-white/70 text-[11px]">
                        <CheckCircle2 size={13} className="text-white shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Link
                    href="/courses"
                    className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-xl font-mono"
                  >
                    <span>{t('propChallenge.prepLessons')}</span>
                    <ArrowRight size={13} />
                  </Link>
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
