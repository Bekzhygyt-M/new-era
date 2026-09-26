import Link from 'next/link';
import { Target, Users, BookOpen, TrendingUp, Shield, Award, ArrowRight } from 'lucide-react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { getTranslations } from '@/lib/i18n/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const { t } = await getTranslations();
  const settings = await db.getSettings();

  const whyCards = [
    { icon: Users, title: t('about.why1Title'), desc: t('about.why1Desc') },
    { icon: TrendingUp, title: t('about.why2Title'), desc: t('about.why2Desc') },
    { icon: Shield, title: t('about.why3Title'), desc: t('about.why3Desc') },
    { icon: Award, title: t('about.why4Title'), desc: t('about.why4Desc') },
    { icon: BookOpen, title: t('about.why5Title'), desc: t('about.why5Desc') },
    { icon: Target, title: t('about.why6Title'), desc: t('about.why6Desc') },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between">
      <Navbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-5xl mx-auto space-y-16">

          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              {t('about.heroTitlePlain')}{' '}
              <span className="underline decoration-white/30 underline-offset-8">{t('about.heroTitleUnderline')}</span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">{t('about.heroSubtitle')}</p>
          </div>

          <div className="relative rounded-3xl overflow-hidden aspect-[21/9] bg-[#000000] border border-white/15 flex items-center justify-center p-8 sm:p-12 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
            <div className="relative z-20 max-w-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-white/50 mb-2 block font-bold">
                {t('about.philosophyBadge')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
                {t('about.philosophyHeading')}
              </h2>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">{t('about.philosophyBody')}</p>
            </div>
            <Target className="absolute right-8 md:right-16 text-white/[0.04] w-64 h-64" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#000000] border border-white/15 rounded-3xl p-8 shadow-xl">
              <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-6 border border-white/15">
                <Target size={22} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">{t('about.missionTitle')}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{t('about.missionBody')}</p>
            </div>

            <div className="bg-[#000000] border border-white/15 rounded-3xl p-8 shadow-xl">
              <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-6 border border-white/15">
                <BookOpen size={22} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">{t('about.approachTitle')}</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                {t('about.approachBody', { pass: settings.passing_score })}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white mb-8 text-center tracking-tight">{t('about.whyTitle')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {whyCards.map((feature, idx) => (
                <div key={idx} className="bg-[#000000] border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all shadow-xl">
                  <feature.icon size={22} className="text-white mb-4" />
                  <h4 className="text-white font-bold mb-1.5 text-sm">{feature.title}</h4>
                  <p className="text-white/50 text-xs leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Box */}
          <div className="bg-[#000000] border border-white/20 rounded-3xl p-10 text-center flex flex-col items-center shadow-2xl space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white">{t('about.ctaTitle')}</h2>
            <p className="text-white/60 text-sm max-w-xl">{t('about.ctaBody')}</p>
            <Link
              href="/courses"
              className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-wider rounded-xl hover:bg-neutral-200 transition-all flex items-center gap-2 shadow-xl"
            >
              <span>{t('about.ctaButton')}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
