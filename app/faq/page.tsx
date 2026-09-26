import { getFaqRows } from '@/lib/content/faq';
import { getTranslations } from '@/lib/i18n/server';
import FAQClient from './FAQClient';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';

export const dynamic = 'force-dynamic';

export default async function FAQPage() {
  // Admin-authored FAQ when it exists, otherwise answers generated from the
  // live platform settings, so thresholds always match the engine (TZ §25).
  const { locale, t } = await getTranslations();
  const faqs = await getFaqRows(locale);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between">
      <Navbar />
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              <span className="underline decoration-white/30 underline-offset-8">{t('faq.pageTitle')}</span>
            </h1>
            <p className="text-white/60 text-lg">
              {t('faq.pageSubtitle')}
            </p>
          </div>

          {faqs.length > 0 ? (
            <FAQClient faqs={faqs} />
          ) : (
            <div className="text-center p-12 bg-[#000000] border border-white/10 rounded-3xl text-white/50 shadow-xl">
              {t('faq.empty')}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
