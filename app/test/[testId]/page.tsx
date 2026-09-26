import { notFound, redirect } from 'next/navigation';
import Navbar from '@/components/navbar/Navbar';
import TestClient from './TestClient';
import { requireUserPage, canAccessCourse, courseIdForLesson } from '@/lib/permissions';
import { db } from '@/lib/db';
import { isTestUnlocked } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * Test page (TZ §13).
 *
 * The questions themselves are fetched from /api/test/start by the client, so
 * the correct answers never travel with the server-rendered HTML either.
 */
export default async function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const auth = await requireUserPage(`/test/${testId}`);

  const test = await db.getTest(testId);
  if (!test || (!test.is_published && !auth.isAdmin)) notFound();

  const lesson = await db.getLesson(test.lesson_id);
  if (!lesson) notFound();

  const courseId = await courseIdForLesson(test.lesson_id);
  if (!await canAccessCourse(auth.profile, courseId)) {
    redirect(`/checkout/${courseId ?? ''}`);
  }

  if (!await isTestUnlocked(auth.profile.id, test.lesson_id) && !auth.isAdmin) {
    redirect(`/lesson/${test.lesson_id}?locked=watch`);
  }

  const attempts = await db.getAttempts(auth.profile.id, test.id);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
        <TestClient
          testId={test.id}
          testTitle={test.title}
          lessonId={test.lesson_id}
          lessonTitle={lesson.title}
          courseId={courseId ?? ''}
          passingScore={test.passing_score}
          maxAttempts={test.max_attempts}
          attemptsUsed={attempts.length}
          bestScore={attempts.reduce((best, a) => Math.max(best, a.score), 0)}
        />
      </main>
    </div>
  );
}
