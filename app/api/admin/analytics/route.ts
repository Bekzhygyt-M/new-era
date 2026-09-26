import { NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Bucket rows into the last `days` calendar days. */
function daily<T>(rows: T[], getDate: (row: T) => string | undefined, days = 30) {
  const buckets = new Map<string, number>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const raw = getDate(row);
    if (!raw) continue;
    const key = raw.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()].map(([date, value]) => ({ date, value }));
}

/**
 * GET /api/admin/analytics — every figure is computed from stored rows.
 * Nothing here is a hard-coded or illustrative number (TZ §31).
 */
export async function GET() {
  try {
    await requireAdminApi();

    const data = await db.raw();
    const stats = await db.getStats();
    const approved = data.payments.filter((p) => p.status === 'approved');

    // Revenue per day over the last 30 days.
    const revenueBuckets = new Map<string, number>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      revenueBuckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const payment of approved) {
      const key = (payment.approved_at || payment.created_at).slice(0, 10);
      if (revenueBuckets.has(key)) {
        revenueBuckets.set(key, (revenueBuckets.get(key) || 0) + payment.amount);
      }
    }

    const levelCounts = data.profiles
      .filter((p) => p.role === 'student')
      .reduce<Record<string, number>>((acc, p) => {
        acc[p.level] = (acc[p.level] || 0) + 1;
        return acc;
      }, {});

    const purchasesByCourse = data.courses.map((course) => {
      const coursePayments = approved.filter((p) => p.course_id === course.id);
      return {
        courseId: course.id,
        title: course.title,
        purchases: coursePayments.length,
        revenue: coursePayments.reduce((s, p) => s + p.amount, 0),
      };
    });

    const lessonStats = data.lessons.map((lesson) => {
      const progress = data.lesson_progress.filter((p) => p.lesson_id === lesson.id);
      const completed = progress.filter((p) => p.completed).length;
      return {
        lessonId: lesson.id,
        title: lesson.title,
        views: progress.length,
        completed,
        completionRate: progress.length ? Math.round((completed / progress.length) * 100) : 0,
      };
    });

    const testStats = data.tests.map((test) => {
      const attempts = data.test_attempts.filter((a) => a.test_id === test.id);
      const passed = attempts.filter((a) => a.passed).length;
      return {
        testId: test.id,
        title: test.title,
        attempts: attempts.length,
        passRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0,
        failRate: attempts.length ? Math.round(100 - (passed / attempts.length) * 100) : 0,
      };
    });

    const activeUsers = data.profiles
      .filter((p) => p.role === 'student')
      .map((p) => ({
        userId: p.id,
        name: p.full_name,
        email: p.email,
        xp: p.xp,
        completedLessons: data.lesson_progress.filter((x) => x.user_id === p.id && x.completed).length,
      }))
      .sort((a, b) => b.completedLessons - a.completedLessons)
      .slice(0, 10);

    const students = data.profiles.filter((p) => p.role === 'student');

    return NextResponse.json({
      stats,
      registrations: daily(students, (p) => p.created_at),
      revenue: [...revenueBuckets.entries()].map(([date, value]) => ({ date, value })),
      purchases: daily(approved, (p) => p.approved_at || p.created_at),
      levelDistribution: Object.entries(levelCounts).map(([name, value]) => ({ name, value })),
      purchasesByCourse,
      mostWatchedLessons: [...lessonStats].sort((a, b) => b.views - a.views).slice(0, 10),
      mostFailedTests: [...testStats].sort((a, b) => b.failRate - a.failRate).slice(0, 10),
      mostActiveUsers: activeUsers,
      averageXp: students.length
        ? Math.round(students.reduce((s, p) => s + (p.xp || 0), 0) / students.length)
        : 0,
      courseCompletion: data.enrollments.filter((e) => e.completed_at).length,
    });
  } catch (error) {
    return apiError(error);
  }
}
