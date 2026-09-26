import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import FAQAccordion from './FAQAccordion';
import { getFaqEntries } from '@/lib/content/faq';

/**
 * Homepage FAQ. Entries come from the admin-managed knowledge base; the
 * fallback answers are generated from live platform settings, never hardcoded.
 */
export default async function FAQ() {
  const { locale, t } = await getTranslations();
  const entries = (await getFaqEntries(locale)).slice(0, 8);

  return (
    <section id="faq" className="border-t border-white/[0.06] bg-[#060606] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <header className="mb-9 text-center">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {t('home.faqTitle')}
          </h2>
          <p className="mt-2 text-sm text-white/50">
            {t('home.faqSubtitle')}
          </p>
        </header>

        <FAQAccordion entries={entries} />

        <p className="mt-8 text-center text-[13px] text-white/40">
          {t('home.faqNotFound')}{' '}
          <Link href="/faq" className="font-semibold text-white underline underline-offset-4">
            {t('home.faqFull')}
          </Link>{' '}
          {t('home.faqOr')}{' '}
          <Link href="/support" className="font-semibold text-white underline underline-offset-4">
            {t('home.faqSupport')}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
