import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/permissions';
import AdminCourseEditClient from './AdminCourseEditClient';

export const dynamic = 'force-dynamic';

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAdminPage();
  const { courseId } = await params;

  const course = await db.getCourse(courseId);
  if (!course) notFound();

  // Real modules and lessons — the editor must show what is actually stored.
  const modules = await Promise.all(
    (await db.getModules(course.id)).map(async (module) => ({
      ...module,
      lessons: await db.getLessons(module.id),
    }))
  );

  return (
    <div className="space-y-8">
      <AdminCourseEditClient initialCourse={{ ...course, modules }} />
    </div>
  );
}
