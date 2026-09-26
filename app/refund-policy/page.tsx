import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function RefundPolicyPage() {
  const { t } = await getTranslations();

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-white/80">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs font-bold mb-8 transition">
          <ChevronLeft size={16} /> {t('legal.backHome')}
        </Link>

        <div className="bg-[#111] border border-white/5 rounded-3xl p-8 sm:p-12 space-y-8">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              {t('legal.refundBadge')}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">{t('legal.refundTitle')}</h1>
            <p className="text-white/40 text-xs mt-2 font-mono">{t('legal.lastUpdated')}</p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-white/70">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">{t('legal.refund1Title')}</h2>
              <p>{t('legal.refund1Body')}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">{t('legal.refund2Title')}</h2>
              <p>{t('legal.refund2Body')}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">{t('legal.refund3Title')}</h2>
              <p>
                {t('legal.refund3Body')}{' '}
                <Link href="/support" className="text-emerald-400 font-bold underline">
                  {t('legal.refund3Link')}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
