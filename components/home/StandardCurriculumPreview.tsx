import CourseCurriculumSection from '@/components/curriculum/CourseCurriculumSection';
import { STANDARD_COURSE } from '@/lib/content/curriculum';
import { localizeCurriculum } from '@/lib/content/curriculum-i18n';
import { getLocale } from '@/lib/i18n/server';

export default async function StandardCurriculumPreview() {
  const locale = await getLocale();
  return <CourseCurriculumSection content={localizeCurriculum(STANDARD_COURSE, locale)} id="standard" />;
}
