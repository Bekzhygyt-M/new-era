import { getTranslations } from '@/lib/i18n/server';
import { localizeAll, localizeTariffNote, localizeTariffHeadings } from '@/lib/content/curriculum-i18n';
import { db } from '@/lib/db';
import { ALL_COURSES, TARIFFS } from '@/lib/content/curriculum';
import CourseCardsClient from './CourseCardsClient';

export default async function CourseCards() {
  const { locale, t } = await getTranslations();
  const localizedCourses = localizeAll(ALL_COURSES, locale);
  const tariffHeadings = localizeTariffHeadings(locale, TARIFFS);
  const settings = await db.getSettings();

  const cards = await Promise.all(
    localizedCourses.map(async (content) => {
      const course = await db.getCourse(content.courseId);
      const tariffIndex = TARIFFS.rows.findIndex((r) => r.slug === content.slug);
      const tariff = TARIFFS.rows[tariffIndex];

      const dbPricing = settings.pricing?.[content.slug as 'standard' | 'pro'];

      return {
        content,
        note: tariff ? localizeTariffNote(locale, tariffIndex, tariff.note) : '',
        published: course?.published ?? true,
        pricing: dbPricing || content.pricing,
      };
    })
  );

  return (
    <CourseCardsClient
      courses={cards}
      title={tariffHeadings.title}
      bestOrder={tariffHeadings.bestOrder}
      bestOrderSub={tariffHeadings.bestOrderSub}
      currencySom={t('common.currencySom')}
    />
  );
}
