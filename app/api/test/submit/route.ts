import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, canAccessCourse, courseIdForLesson, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { isTestUnlocked, completeLesson, scoreOutcome, getCourseStatus } from '@/lib/learning';
import { testSubmissionSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/test/submit — server-side scoring (TZ §13).
 *
 * The client sends only the chosen answer ids. Correctness is resolved from the
 * database here, so the score cannot be tampered with. A pass awards XP once
 * and unlocks the next lesson; a fail awards nothing.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();

    const limit = rateLimit(`test:${auth.profile.id}`, 20, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Juda ko‘p urinish. Biroz kutib turing.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = testSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { testId, answers } = parsed.data;

    const test = await db.getTest(testId);
    if (!test) throw new ApiError('Test topilmadi', 404);

    const lesson = await db.getLesson(test.lesson_id);
    if (!lesson) throw new ApiError('Dars topilmadi', 404);

    const courseId = await courseIdForLesson(test.lesson_id);
    if (!await canAccessCourse(auth.profile, courseId)) {
      throw new ApiError('Bu kursga kirish huquqingiz yo‘q', 403);
    }

    if (!await isTestUnlocked(auth.profile.id, test.lesson_id) && !auth.isAdmin) {
      throw new ApiError('Test hali ochilmagan', 403);
    }

    const attempts = await db.getAttempts(auth.profile.id, test.id);
    if (test.max_attempts && attempts.length >= test.max_attempts && !auth.isAdmin) {
      throw new ApiError('Urinishlar soni tugadi', 403);
    }

    const questions = await db.getTestQuestions(test.id);
    if (!questions.length) throw new ApiError('Testda savollar mavjud emas', 400);

    let earnedPoints = 0;
    let totalPoints = 0;
    let correctCount = 0;

    for (const question of questions) {
      totalPoints += question.points;
      const chosen = answers[question.id];
      const correct = question.answers.find((a) => a.is_correct);
      if (chosen && correct && chosen === correct.id) {
        earnedPoints += question.points;
        correctCount++;
      }
    }

    const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passingScore = test.passing_score || (await db.getSettings()).passing_score;
    const passed = score >= passingScore;
    const outcome = scoreOutcome(score, passingScore);

    await db.saveAttempt({
      user_id: auth.profile.id,
      test_id: test.id,
      lesson_id: test.lesson_id,
      score,
      passed,
      correct_count: correctCount,
      total_questions: questions.length,
      answers_data: answers,
    });

    let xpAwarded = 0;
    let moduleCompleted = false;
    let courseCompleted = false;
    let certificate = null;

    if (passed) {
      const result = await completeLesson(auth.profile.id, test.lesson_id, score);
      xpAwarded = result.xpAwarded;
      moduleCompleted = result.moduleCompleted;
      courseCompleted = result.courseCompleted;
      certificate = result.certificate;

      await db.addNotification({
        user_id: auth.profile.id,
        title: 'Test topshirildi 🎉',
        message: `"${lesson.title}" testidan ${score}% natija. ${
          xpAwarded > 0 ? `+${xpAwarded} XP berildi.` : ''
        } Keyingi dars ochildi.`,
        type: 'test_passed',
        link: courseId ? `/course/${courseId}` : '/dashboard',
      });
      await db.logActivity(auth.profile.id, 'test_passed', { test_id: test.id, score, xp: xpAwarded });
    } else {
      // A failed attempt records the score but never marks the lesson complete.
      await db.saveProgress({
        user_id: auth.profile.id,
        lesson_id: test.lesson_id,
        test_score: score,
        test_passed: false,
      });

      await db.addNotification({
        user_id: auth.profile.id,
        title: 'Testdan o‘ta olmadingiz ⚠️',
        message: `"${lesson.title}" testidan ${score}% to‘pladingiz. O‘tish bali: ${passingScore}%. ${outcome.message}`,
        type: 'test_failed',
        link: `/lesson/${test.lesson_id}`,
      });
      await db.logActivity(auth.profile.id, 'test_failed', { test_id: test.id, score });
    }

    const status = courseId ? await getCourseStatus(auth.profile.id, courseId) : null;
    const profile = await db.getProfile(auth.profile.id);
    const settings = await db.getSettings();
    const telegramChannelUrl =
      (lesson as { telegram_channel_url?: string }).telegram_channel_url ||
      settings.telegram_channel_url ||
      settings.support_telegram ||
      'https://t.me/newera_trading';

    return NextResponse.json({
      score,
      passed,
      passingScore,
      correctCount,
      totalQuestions: questions.length,
      xpAwarded,
      totalXp: profile?.xp ?? 0,
      level: profile?.level ?? 'Beginner',
      outcome: outcome.bucket,
      outcomeMessage: outcome.message,
      lessonId: test.lesson_id,
      nextLessonId: status?.nextLessonId ?? null,
      moduleCompleted,
      courseCompleted,
      certificateId: certificate?.certificate_id ?? null,
      attemptsUsed: attempts.length + 1,
      maxAttempts: test.max_attempts,
      telegramChannelUrl,
    });
  } catch (error) {
    return apiError(error);
  }
}
