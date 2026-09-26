import { ArrowRight } from 'lucide-react';
import { localizeResultActions, localizeJourney } from '@/lib/content/curriculum-i18n';
import { getTranslations } from '@/lib/i18n/server';
import { STUDENT_JOURNEY, RESULT_TABLE } from '@/lib/content/curriculum';
import { db } from '@/lib/db';

/**
 * The student journey and the result table (TZ §7.5, §7.10).
 * The passing score is read from platform settings, so the page can never
 * advertise a threshold that differs from the one the engine enforces.
 */
export default async function LearningJourney() {
  const { locale, t } = await getTranslations();
  const settings = await db.getSettings();

  const actions = localizeResultActions(locale, RESULT_TABLE.map((r) => r.action));
  const resultRows = RESULT_TABLE.map((row, index) => ({
    ...row,
    action: actions[index],
    range: row.range === '90-100%' ? `${settings.passing_score}-100%` : row.range,
  }));

  const journey = localizeJourney(locale, [...STUDENT_JOURNEY]);

  return (
    <section id="journey" className="border-t border-white/[0.06] bg-[#060606] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="mb-10">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {t('home.journeyTitle')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            {t('home.journeySubtitle')}
          </p>
        </header>

        {/* Journey chain */}
        <ol className="mb-12 flex flex-wrap items-center gap-x-2 gap-y-3">
          {journey.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-xl border border-white/12 bg-white/[0.025] px-3.5 py-2 text-[12px] font-bold text-white/80">
                {step}
              </span>
              {index < journey.length - 1 && (
                <ArrowRight size={14} className="text-white/25" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>

        {/* Result table */}
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{t('home.resultCaption')}</caption>
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th scope="col" className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-white/50">
                  {t('home.resultColScore')}
                </th>
                <th scope="col" className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-white/50">
                  {t('home.resultColNext')}
                </th>
              </tr>
            </thead>
            <tbody>
              {resultRows.map((row) => (
                <tr key={row.range} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-5 py-4 font-mono text-sm font-bold text-white">{row.range}</td>
                  <td className="px-5 py-4 text-[13px] text-white/65">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 text-[13px] font-semibold text-white/70">
          {t('home.strictRule', {
            watch: settings.watch_requirement,
            pass: settings.passing_score,
          })}
        </p>
      </div>
    </section>
  );
}
