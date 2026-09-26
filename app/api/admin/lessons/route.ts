import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { lessonSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** Per-lesson analytics used by /admin/lessons (TZ §22.5, §31). */
async function lessonAnalytics(lessonId: string) {
  const progress = (await db.raw()).lesson_progress.filter((p) => p.lesson_id === lessonId);
  const views = progress.length;
  const completed = progress.filter((p) => p.completed).length;
  const avgWatch = views
    ? Math.round(progress.reduce((s, p) => s + p.watch_percentage, 0) / views)
    : 0;

  return {
    views,
    completed,
    completionRate: views ? Math.round((completed / views) * 100) : 0,
    averageWatch: avgWatch,
    dropOffRate: views ? Math.round(100 - (completed / views) * 100) : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const moduleId = new URL(request.url).searchParams.get('moduleId') || undefined;

    const lessons = await Promise.all(
      (await db.getLessons(moduleId)).map(async (lesson) => {
        const lessonModule = await db.getModule(lesson.module_id);
        return {
          ...lesson,
          moduleTitle: lessonModule?.title || null,
          courseId: lessonModule?.course_id || null,
          courseTitle: lessonModule
            ? (await db.getCourse(lessonModule.course_id))?.title || null
            : null,
          hasTest: Boolean(await db.getTestByLesson(lesson.id)),
          analytics: await lessonAnalytics(lesson.id),
        };
      })
    );

    return NextResponse.json({ lessons });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = lessonSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (!await db.getModule(parsed.data.module_id)) {
      return NextResponse.json({ error: 'Modul topilmadi' }, { status: 404 });
    }

    const provider =
      parsed.data.video_provider ||
      (/t\.me|telegram\.me/.test(parsed.data.video_url)
        ? 'telegram'
        : /youtube\.com|youtu\.be/.test(parsed.data.video_url)
        ? 'youtube'
        : parsed.data.video_url.startsWith('/api/video/') ||
            parsed.data.video_url.startsWith('/uploads/')
          ? 'file'
          : 'direct');

    const lesson = await db.saveLesson({ ...parsed.data, video_provider: provider });
    await db.logActivity(auth.profile.id, parsed.data.id ? 'lesson_updated' : 'lesson_created', {
      lesson_id: lesson.id,
    });

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const deleted = await db.deleteLesson(id);
    if (!deleted) return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });

    await db.logActivity(auth.profile.id, 'lesson_deleted', { lesson_id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
