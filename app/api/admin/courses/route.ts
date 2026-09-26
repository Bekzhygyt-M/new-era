import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { courseSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminApi();
    const enrollments = await db.getEnrollments();
    const courses = await Promise.all(
      (await db.getCourses()).map(async (course) => {
        const modules = await db.getModules(course.id);
        const lessons = (await Promise.all(modules.map((m) => db.getLessons(m.id)))).flat();
        return {
          ...course,
          moduleCount: modules.length,
          lessonCount: lessons.length,
          enrollmentCount: enrollments.filter(
            (e) => e.course_id === course.id && e.status === 'active'
          ).length,
        };
      })
    );
    return NextResponse.json({ courses });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = courseSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const duplicate = await db.getCourse(parsed.data.slug);
    if (duplicate && duplicate.id !== parsed.data.id) {
      return NextResponse.json({ error: 'Bu slug band' }, { status: 409 });
    }

    const course = await db.saveCourse(parsed.data);
    await db.logActivity(auth.profile.id, parsed.data.id ? 'course_updated' : 'course_created', {
      course_id: course.id,
    });

    return NextResponse.json({ success: true, course });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const enrolled = (await db.getEnrollments()).filter((e) => e.course_id === id && e.status === 'active');
    if (enrolled.length) {
      return NextResponse.json(
        { error: `Bu kursda ${enrolled.length} ta faol o‘quvchi bor. Avval kursni "unpublish" qiling.` },
        { status: 409 }
      );
    }

    const deleted = await db.deleteCourse(id);
    if (!deleted) return NextResponse.json({ error: 'Kurs topilmadi' }, { status: 404 });

    await db.logActivity(auth.profile.id, 'course_deleted', { course_id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
