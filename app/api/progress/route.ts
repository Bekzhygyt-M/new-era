import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, canAccessCourse, courseIdForLesson, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { videoProgressSchema } from '@/lib/validations';
import { isLessonUnlocked, isTestUnlocked } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/progress?lessonId=... — the caller's saved position for a lesson.
 * Lets the player resume from any device (TZ §11).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const lessonId = new URL(request.url).searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ progress: await db.getProgress(auth.profile.id) });
    }

    const progress = await db.getLessonProgress(auth.profile.id, lessonId);
    return NextResponse.json({
      watchedSeconds: progress?.watched_seconds ?? 0,
      watchPercentage: progress?.watch_percentage ?? 0,
      videoCompleted: progress?.video_completed ?? false,
      testUnlocked: await isTestUnlocked(auth.profile.id, lessonId),
      testPassed: progress?.test_passed ?? false,
      testScore: progress?.test_score ?? 0,
      completed: progress?.completed ?? false,
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST /api/progress — records watch progress.
 *
 * The watched position is clamped to the real lesson duration, so a client
 * cannot claim 100% by posting an inflated number; progress only moves forward.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const body = await request.json();
    const parsed = videoProgressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { lessonId, watchedSeconds, duration } = parsed.data;

    const lesson = await db.getLesson(lessonId);
    if (!lesson) throw new ApiError('Dars topilmadi', 404);

    const courseId = await courseIdForLesson(lessonId);
    if (!await canAccessCourse(auth.profile, courseId)) {
      throw new ApiError('Bu kursga kirish huquqingiz yo‘q', 403);
    }

    const unlock = await isLessonUnlocked(auth.profile.id, lessonId);
    if (!unlock.unlocked && !auth.isAdmin) {
      throw new ApiError(unlock.reason || 'Dars hali ochilmagan', 403);
    }

    // Trust the lesson's stored duration over the client's when we have one.
    const effectiveDuration = lesson.duration > 0 ? lesson.duration : duration;
    const clampedSeconds = Math.min(Math.max(watchedSeconds, 0), effectiveDuration);
    const watchPercentage = Math.min(Math.round((clampedSeconds / effectiveDuration) * 100), 100);

    const requirement = lesson.watch_requirement || (await db.getSettings()).watch_requirement;
    const previous = await db.getLessonProgress(auth.profile.id, lessonId);
    const videoCompleted = watchPercentage >= requirement;

    const saved = await db.saveProgress({
      user_id: auth.profile.id,
      lesson_id: lessonId,
      watched_seconds: clampedSeconds,
      watch_percentage: watchPercentage,
      video_completed: videoCompleted,
    });

    if (videoCompleted && !previous?.video_completed) {
      await db.logActivity(auth.profile.id, 'video_completed', {
        lesson_id: lessonId,
        watch_percentage: saved.watch_percentage,
      });
    }

    return NextResponse.json({
      watchedSeconds: saved.watched_seconds,
      watchPercentage: saved.watch_percentage,
      videoCompleted: saved.video_completed,
      testUnlocked: saved.watch_percentage >= requirement,
      requirement,
    });
  } catch (error) {
    return apiError(error);
  }
}
