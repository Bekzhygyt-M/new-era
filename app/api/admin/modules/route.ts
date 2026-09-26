import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { moduleSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const courseId = new URL(request.url).searchParams.get('courseId') || undefined;

    let rawModules = await db.getModules(courseId);
    if (!rawModules.length) {
      try {
        const { seedCatalog } = await import('@/lib/content/seed');
        await seedCatalog();
        rawModules = await db.getModules(courseId);
      } catch (seedErr) {
        console.error('[modules] auto-seed error:', seedErr);
      }
    }

    const modules = await Promise.all(
      rawModules.map(async (module) => ({
        ...module,
        lessonCount: (await db.getLessons(module.id)).length,
        courseTitle: (await db.getCourse(module.course_id))?.title || null,
      }))
    );

    return NextResponse.json({ modules });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = moduleSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (!await db.getCourse(parsed.data.course_id)) {
      return NextResponse.json({ error: 'Kurs topilmadi' }, { status: 404 });
    }

    const savedModule = await db.saveModule(parsed.data);
    await db.logActivity(auth.profile.id, parsed.data.id ? 'module_updated' : 'module_created', {
      module_id: savedModule.id,
    });

    return NextResponse.json({ success: true, module: savedModule });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const deleted = await db.deleteModule(id);
    if (!deleted) return NextResponse.json({ error: 'Modul topilmadi' }, { status: 404 });

    await db.logActivity(auth.profile.id, 'module_deleted', { module_id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
