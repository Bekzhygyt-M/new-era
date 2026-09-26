import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { testSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const url = new URL(request.url);
    const testId = url.searchParams.get('id');
    const attempts = await db.getAllAttempts();

    // Single test, including correct answers — admin editing view.
    if (testId) {
      const test = await db.getTest(testId);
      if (!test) return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });

      return NextResponse.json({
        test,
        questions: await db.getTestQuestions(test.id),
        lesson: await db.getLesson(test.lesson_id),
      });
    }

    const tests = await Promise.all(
      (await db.getTests()).map(async (test) => {
      const testAttempts = attempts.filter((a) => a.test_id === test.id);
      const passed = testAttempts.filter((a) => a.passed).length;
      const lesson = await db.getLesson(test.lesson_id);

      return {
        ...test,
        lessonTitle: lesson?.title || null,
        questionCount: (await db.getTestQuestions(test.id)).length,
        attempts: testAttempts.length,
        passRate: testAttempts.length ? Math.round((passed / testAttempts.length) * 100) : 0,
        averageScore: testAttempts.length
          ? Math.round(testAttempts.reduce((s, a) => s + a.score, 0) / testAttempts.length)
          : 0,
      };
      })
    );

    return NextResponse.json({ tests });
  } catch (error) {
    return apiError(error);
  }
}

/** Creates or replaces a test together with its full question set. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const body = await request.json();
    const parsed = testSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (!await db.getLesson(parsed.data.lesson_id)) {
      return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });
    }

    const existing = await db.getTestByLesson(parsed.data.lesson_id);
    const test = await db.saveTest({
      id: body.id || existing?.id,
      lesson_id: parsed.data.lesson_id,
      title: parsed.data.title,
      passing_score: parsed.data.passing_score,
      max_attempts: parsed.data.max_attempts ?? null,
      is_published: parsed.data.is_published,
    });

    const count = await db.replaceTestQuestions(test.id, parsed.data.questions);
    await db.logActivity(auth.profile.id, 'test_saved', { test_id: test.id, questions: count });

    return NextResponse.json({ success: true, test, questionCount: count });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const deleted = await db.deleteTest(id);
    if (!deleted) return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });

    await db.logActivity(auth.profile.id, 'test_deleted', { test_id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
