import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, canAccessCourse, courseIdForLesson } from '@/lib/permissions';
import { db } from '@/lib/db';
import { isTestUnlocked } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test/by-lesson?lessonId=...
 * Returns test metadata only — never the questions or the correct answers.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const lessonId = new URL(request.url).searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId kerak' }, { status: 400 });
    }

    const courseId = await courseIdForLesson(lessonId);
    if (!await canAccessCourse(auth.profile, courseId)) {
      return NextResponse.json({ test: null, locked: true }, { status: 403 });
    }

    const test = await db.getTestByLesson(lessonId);
    if (!test || !test.is_published) {
      return NextResponse.json({ test: null });
    }

    const unlocked = await isTestUnlocked(auth.profile.id, lessonId) || auth.isAdmin;
    const attempts = await db.getAttempts(auth.profile.id, test.id);

    return NextResponse.json({
      test: {
        id: test.id,
        title: test.title,
        lesson_id: test.lesson_id,
        passing_score: test.passing_score,
        questionCount: (await db.getTestQuestions(test.id)).length,
        max_attempts: test.max_attempts,
      },
      unlocked,
      attemptsUsed: attempts.length,
      bestScore: attempts.reduce((best, a) => Math.max(best, a.score), 0),
    });
  } catch (error) {
    return apiError(error);
  }
}
