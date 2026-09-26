'use client';

import UserSidebar from '@/components/dashboard/UserSidebar';
import UserHeader from '@/components/dashboard/UserHeader';
import DashboardFooter from '@/components/dashboard/DashboardFooter';
import { ShieldCheck, ExternalLink, Star, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';


export default function BrokersPage() {
  const { t } = useI18n();

  // Inside the component so descriptions can be translated; names, ratings,
  // regulators and figures are the broker's own data.
  const BROKERS = [
    { id: '1', name: 'Exness', type: t('brokers.b1Type'), minDeposit: '$10', leverage: '1:2000', spread: t('brokers.fromPips', { n: '0.0' }), regulation: 'FCA, CySEC, FSA', rating: 4.9, link: 'https://exness.com', features: [t('brokers.b1f1'), t('brokers.b1f2'), t('brokers.b1f3')] },
    { id: '2', name: 'IC Markets', type: t('brokers.b2Type'), minDeposit: '$200', leverage: '1:500', spread: t('brokers.fromPips', { n: '0.0' }), regulation: 'ASIC, CySEC, FSA', rating: 4.8, link: 'https://icmarkets.com', features: [t('brokers.b2f1'), t('brokers.b2f2'), t('brokers.b2f3')] },
    { id: '3', name: 'Pepperstone', type: t('brokers.b3Type'), minDeposit: '$0', leverage: '1:400', spread: t('brokers.fromPips', { n: '0.1' }), regulation: 'FCA, ASIC, DFSA', rating: 4.8, link: 'https://pepperstone.com', features: [t('brokers.b3f1'), t('brokers.b3f2'), t('brokers.b3f3')] },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans text-white selection:bg-white selection:text-black">
      <UserSidebar activeTab="brokers" />

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#050505]">
        <UserHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* Header */}
          <div className="pb-4 border-b border-white/10">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase">{t('brokers.title')}</h1>
            <p className="text-xs sm:text-sm text-white/50">{t('brokers.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {BROKERS.map((b) => (
              <div
                key={b.id}
                className="bg-[#000000] border border-white/15 rounded-3xl p-6 flex flex-col justify-between hover:border-white transition duration-200 shadow-2xl space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                      <ShieldCheck size={11} /> {t('brokers.licensed')}
                    </span>
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                      <Star size={12} className="fill-white" /> {b.rating}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-1 font-mono">{b.name}</h3>
                  <p className="text-xs text-white/50 font-mono mb-4">{b.type}</p>

                  <div className="grid grid-cols-2 gap-2 bg-[#080808] border border-white/10 rounded-2xl p-3 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-white/40 block font-mono">{t('brokers.minDeposit')}</span>
                      <span className="font-bold text-white font-mono">{b.minDeposit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 block font-mono">{t('brokers.spread')}</span>
                      <span className="font-bold text-white font-mono">{b.spread}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {b.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-white/70 text-[11px]">
                        <CheckCircle2 size={13} className="text-white shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-xl font-mono"
                  >
                    <span>{t('brokers.openAccount')}</span>
                    <ExternalLink size={13} />
                  </a>
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
