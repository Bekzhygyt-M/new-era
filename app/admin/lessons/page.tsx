import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import AdminLessonsClient from './AdminLessonsClient';

export const dynamic = 'force-dynamic';

export default async function AdminLessonsPage() {
  await requireAdminPage();

  const courses = await db.getCourses();

  // Resolve the real module and course behind each lesson — titles must come
  // from the database, not from guessing at the module id (TZ §22.5).
  const lessons = await Promise.all(
    (await db.getLessons()).map(async (lesson) => {
      const lessonModule = await db.getModule(lesson.module_id);
      const course = lessonModule ? await db.getCourse(lessonModule.course_id) : null;

      return {
        ...lesson,
        hasTest: Boolean(await db.getTestByLesson(lesson.id)),
        modules: lessonModule
          ? {
              id: lessonModule.id,
              title: lessonModule.title,
              course_id: lessonModule.course_id,
              courses: course
                ? { id: course.id, title: course.title, level: course.level }
                : null,
            }
          : null,
      };
    })
  );

  return (
    <div>
      <AdminLessonsClient initialLessons={lessons} initialCourses={courses} />
    </div>
  );
}
