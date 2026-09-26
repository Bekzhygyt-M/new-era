import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { translationSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/translations — everything the translation editor needs:
 * the translatable entities in course order, plus the overrides that exist.
 */
export async function GET() {
  try {
    await requireAdminApi();

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

    return NextResponse.json({
      courses: courses.map((c) => ({ id: c.id, title: c.title })),
      entities,
      translations: await db.getTranslations(),
    });
  } catch (error) {
    return apiError(error);
  }
}

/** POST — create or update one ru/en override. Blank fields fall back to Uzbek. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = translationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { entity, entity_id: entityId } = parsed.data;

    // Refuse to translate something that no longer exists.
    const exists =
      entity === 'course'
        ? await db.getCourse(entityId)
        : entity === 'module'
          ? await db.getModule(entityId)
          : await db.getLesson(entityId);
    if (!exists) throw new ApiError('Element topilmadi', 404);

    const translation = await db.saveTranslation(parsed.data);
    await db.logActivity(auth.profile.id, 'translation_saved', {
      entity,
      entity_id: entityId,
      locale: parsed.data.locale,
    });

    return NextResponse.json({ success: true, translation });
  } catch (error) {
    return apiError(error);
  }
}

/** DELETE — drop an override so the page falls back to the Uzbek original. */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const url = new URL(request.url);
    const entity = url.searchParams.get('entity');
    const entityId = url.searchParams.get('id');
    const locale = url.searchParams.get('locale');

    if (!entity || !entityId || !locale) throw new ApiError('entity, id va locale kerak', 400);
    if (!['course', 'module', 'lesson'].includes(entity)) throw new ApiError('Noma’lum element turi', 400);
    if (!['ru', 'en'].includes(locale)) throw new ApiError('Noma’lum til', 400);

    const removed = await db.deleteTranslation(
      entity as 'course' | 'module' | 'lesson',
      entityId,
      locale as 'ru' | 'en'
    );
    if (!removed) throw new ApiError('Tarjima topilmadi', 404);

    await db.logActivity(auth.profile.id, 'translation_deleted', { entity, entity_id: entityId, locale });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
