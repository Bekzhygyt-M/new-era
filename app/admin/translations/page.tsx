import { requireAdminPage } from '@/lib/permissions';
import { db } from '@/lib/db';
import AdminTranslationsClient from './AdminTranslationsClient';

export const dynamic = 'force-dynamic';

/** Translation editor for course content (TZ §25). */
export default async function AdminTranslationsPage() {
  await requireAdminPage();

  // Three queries, then grouped in memory — the nested loop version issued one
  // request per course and per module, which a real database would feel.
  const [courses, modules, lessons] = await Promise.all([
    db.getCourses(),
    db.getModules(),
    db.getLessons(),
  ]);

  const modulesByCourse = new Map<string, typeof modules>();
  for (const m of modules) {
    const list = modulesByCourse.get(m.course_id) || [];
    list.push(m);
    modulesByCourse.set(m.course_id, list);
  }

  const lessonsByModule = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const list = lessonsByModule.get(l.module_id) || [];
    list.push(l);
    lessonsByModule.set(l.module_id, list);
  }

  const entities: { entity: 'course' | 'module' | 'lesson'; id: string; label: string; courseId: string }[] = [];

  for (const course of courses) {
    entities.push({ entity: 'course', id: course.id, label: course.title, courseId: course.id });

    for (const courseModule of modulesByCourse.get(course.id) || []) {
      entities.push({ entity: 'module', id: courseModule.id, label: courseModule.title, courseId: course.id });

      for (const lesson of lessonsByModule.get(courseModule.id) || []) {
        entities.push({ entity: 'lesson', id: lesson.id, label: lesson.title, courseId: course.id });
      }
    }
  }

  return (
    <AdminTranslationsClient
      courses={courses.map((c) => ({ id: c.id, title: c.title }))}
      entities={entities}
      initialTranslations={await db.getTranslations()}
    />
  );
}
