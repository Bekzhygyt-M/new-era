import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import AdminLessonEditClient from './AdminLessonEditClient';

export const dynamic = 'force-dynamic';

export default async function AdminLessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  await requireAdminPage();
  const { lessonId } = await params;

  const lesson = await db.getLesson(lessonId);
  if (!lesson) notFound();

  // Every module in the platform, labelled by its real course.
  const modules = await Promise.all(
    (await db.getModules()).map(async (module) => {
      const course = await db.getCourse(module.course_id);
      return {
        id: module.id,
        title: module.title,
        course_id: module.course_id,
        courses: course ? { id: course.id, title: course.title, level: course.level } : null,
      };
    })
  );

  // The test actually attached to this lesson — null when none exists yet, so
  // the editor opens an empty builder instead of a fabricated test.
  const test = await db.getTestByLesson(lesson.id);
  const attachedTest = test
    ? { ...test, questions: await db.getTestQuestions(test.id) }
    : null;

  return (
    <div className="space-y-8">
      <AdminLessonEditClient
        initialLesson={lesson}
        modules={modules}
        initialTest={attachedTest}
      />
    </div>
  );
}
