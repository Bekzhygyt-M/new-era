import { db } from '@/lib/db';
import type { Locale } from '@/lib/i18n';
import type { LocalCourse, LocalLesson, LocalModule, LocalTranslation } from '@/lib/local-db';

/**
 * Applies ru/en overrides to course content (TZ §25).
 *
 * Uzbek is the base language and needs no lookup. A translation row may be
 * partial: any field left blank falls back to the original, so publishing a
 * half-finished translation never blanks the page.
 */

type Entity = LocalTranslation['entity'];

/** Empty strings count as "not translated" — the admin left the field alone. */
function pick<T extends string | null | undefined>(override: T, base: T): T {
  return override != null && String(override).trim() !== '' ? override : base;
}

export function isTranslatable(locale: Locale): locale is 'ru' | 'en' {
  return locale === 'ru' || locale === 'en';
}

/** Overrides for one entity kind, keyed by the id they belong to. */
export async function translationMap(
  entity: Entity,
  locale: Locale
): Promise<Map<string, LocalTranslation>> {
  if (!isTranslatable(locale)) return new Map();
  const list = await db.getTranslations(entity, locale);
  return new Map(list.map((t) => [t.entity_id, t]));
}

export function localizeCourse<T extends LocalCourse>(course: T, t?: LocalTranslation): T {
  if (!t) return course;
  return {
    ...course,
    title: pick(t.title, course.title) as string,
    short_description: pick(t.short_description, course.short_description) as string,
    description: pick(t.description, course.description) as string,
  };
}

export function localizeModule<T extends LocalModule>(module: T, t?: LocalTranslation): T {
  if (!t) return module;
  return {
    ...module,
    title: pick(t.title, module.title) as string,
    description: pick(t.description, module.description),
  };
}

export function localizeLesson<T extends LocalLesson>(lesson: T, t?: LocalTranslation): T {
  if (!t) return lesson;
  return {
    ...lesson,
    title: pick(t.title, lesson.title) as string,
    short_description: pick(t.short_description, lesson.short_description),
    description: pick(t.description, lesson.description),
    summary: pick(t.summary, lesson.summary),
    key_terms: t.key_terms?.length ? t.key_terms : lesson.key_terms,
  };
}

/** Convenience: localize a list of courses in one round trip. */
export async function localizeCourses<T extends LocalCourse>(courses: T[], locale: Locale): Promise<T[]> {
  if (!isTranslatable(locale) || !courses.length) return courses;
  const map = await translationMap('course', locale);
  return courses.map((c) => localizeCourse(c, map.get(c.id)));
}
