import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, canAccessCourse, courseIdForLesson, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { isTestUnlocked } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test/start?testId=...
 *
 * Delivers the questions for an attempt with `is_correct` stripped out — the
 * correct answers never reach the client (TZ §13).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const testId = new URL(request.url).searchParams.get('testId');

    if (!testId) throw new ApiError('testId kerak', 400);

    const test = await db.getTest(testId);
    if (!test || !test.is_published) throw new ApiError('Test topilmadi', 404);

    const courseId = await courseIdForLesson(test.lesson_id);
    if (!await canAccessCourse(auth.profile, courseId)) {
      throw new ApiError('Bu kursga kirish huquqingiz yo‘q', 403);
    }

    // TZ §7.3/§12: the video gate is enforced here, not only in the UI.
    if (!await isTestUnlocked(auth.profile.id, test.lesson_id) && !auth.isAdmin) {
      const lesson = await db.getLesson(test.lesson_id);
      const requirement = lesson?.watch_requirement || (await db.getSettings()).watch_requirement;
      throw new ApiError(`Testni ochish uchun videoni kamida ${requirement}% ko‘rish kerak`, 403);
    }

    const attempts = await db.getAttempts(auth.profile.id, test.id);
    if (test.max_attempts && attempts.length >= test.max_attempts && !auth.isAdmin) {
      throw new ApiError('Urinishlar soni tugadi', 403);
    }

    const questions = (await db.getTestQuestions(test.id)).map((q) => ({
      id: q.id,
      question: q.question,
      points: q.points,
      multiple: q.multiple,
      answers: q.answers.map((a) => ({ id: a.id, answer: a.answer })),
    }));

    if (!questions.length) throw new ApiError('Testda savollar mavjud emas', 400);

    return NextResponse.json({
      test: {
        id: test.id,
        title: test.title,
        lesson_id: test.lesson_id,
        passing_score: test.passing_score,
      },
      questions,
      attemptsUsed: attempts.length,
      maxAttempts: test.max_attempts,
    });
  } catch (error) {
    return apiError(error);
  }
}
