import CourseCurriculumSection from '@/components/curriculum/CourseCurriculumSection';
import { PRO_COURSE } from '@/lib/content/curriculum';
import { localizeCurriculum } from '@/lib/content/curriculum-i18n';
import { getLocale } from '@/lib/i18n/server';

export default async function ProCurriculumPreview() {
  const locale = await getLocale();
  return <CourseCurriculumSection content={localizeCurriculum(PRO_COURSE, locale)} id="pro" />;
}
