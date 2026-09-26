import { db } from '@/lib/db';
import type { LocalLesson, LocalModule } from '@/lib/local-db';

/**
 * The learning engine (TZ §7, §13, §14, §15).
 *
 * Rules enforced here — not in the UI:
 *  - a lesson's test unlocks only after `watch_requirement`% of the video;
 *  - a score below the passing score never unlocks the next lesson;
 *  - lessons unlock strictly in sequence within a course;
 *  - XP is awarded once per lesson / test / module / course.
 */

export type LessonState = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface LessonStatus {
  lesson: LocalLesson;
  state: LessonState;
  watchPercentage: number;
  testUnlocked: boolean;
  testPassed: boolean;
  testScore: number;
  completed: boolean;
  /** Why the lesson is locked, for the UI to explain instead of just greying out. */
  lockReason?: string;
}

export interface ModuleStatus {
  module: LocalModule;
  lessons: LessonStatus[];
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  completed: boolean;
  unlocked: boolean;
  requiresBacktest: boolean;
  requiresJournal: boolean;
  backtestDone: boolean;
  journalDone: boolean;
}

export interface CourseStatus {
  courseId: string;
  modules: ModuleStatus[];
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  completed: boolean;
  averageTestScore: number;
  nextLessonId: string | null;
}

/**
 * Result buckets from TZ §7.5:
 *   0–69   → rewatch the lesson
 *   70–89  → retake the test
 *   90–100 → next lesson unlocks
 */
export function scoreOutcome(score: number, passingScore: number): {
  bucket: 'rewatch' | 'retry' | 'passed';
  message: string;
} {
  if (score >= passingScore) {
    return { bucket: 'passed', message: 'Ajoyib! Keyingi dars ochildi.' };
  }
  if (score >= 70) {
    return { bucket: 'retry', message: 'Yaqin qoldingiz. Testni qayta topshiring.' };
  }
  return { bucket: 'rewatch', message: 'Natija past. Darsni qaytadan ko‘rib chiqing.' };
}

/** Full per-lesson status for one course, applying sequential unlocking. */
export async function getCourseStatus(userId: string, courseId: string): Promise<CourseStatus> {
  // Everything is fetched up front and in parallel. Reading per module or per
  // lesson inside the loops below turns one page into dozens of round trips
  // once the store is a real database.
  const [settings, modules, progressRows, backtests, journal, courseLessons, tests] = await Promise.all([
    db.getSettings(),
    db.getModules(courseId),
    db.getProgress(userId),
    db.getBacktests(userId),
    db.getJournal(userId),
    db.getCourseLessons(courseId),
    db.getTests(),
  ]);

  const progressByLesson = new Map(progressRows.map((p) => [p.lesson_id, p]));
  const testByLesson = new Map(tests.map((t) => [t.lesson_id, t]));

  const lessonsByModule = new Map<string, typeof courseLessons>();
  for (const lesson of courseLessons) {
    const list = lessonsByModule.get(lesson.module_id) || [];
    list.push(lesson);
    lessonsByModule.set(lesson.module_id, list);
  }

  const moduleStatuses: ModuleStatus[] = [];

  // A lesson unlocks when every earlier lesson in the course is completed.
  let previousCompleted = true;
  let nextLessonId: string | null = null;
  let totalLessons = 0;
  let completedLessons = 0;
  const scores: number[] = [];

  let previousModuleCompleted = true;

  for (const mod of modules) {
    const lessons = (lessonsByModule.get(mod.id) || []).filter((l) => l.is_published);
    const lessonStatuses: LessonStatus[] = [];
    const moduleUnlocked = previousModuleCompleted;

    for (const lesson of lessons) {
      totalLessons++;
      const progress = progressByLesson.get(lesson.id);
      const watchPercentage = progress?.watch_percentage ?? 0;
      const requirement = lesson.watch_requirement || settings.watch_requirement;
      const testPassed = progress?.test_passed ?? false;
      const testScore = progress?.test_score ?? 0;
      const completed = progress?.completed ?? false;
      const test = testByLesson.get(lesson.id) || null;

      if (completed) completedLessons++;
      if (testScore > 0) scores.push(testScore);

      const unlocked = moduleUnlocked && previousCompleted;
      let state: LessonState = 'locked';
      let lockReason: string | undefined;

      if (completed) {
        state = 'completed';
      } else if (unlocked) {
        state = watchPercentage > 0 ? 'in_progress' : 'unlocked';
        if (!nextLessonId) nextLessonId = lesson.id;
      } else {
        lockReason = moduleUnlocked
          ? 'Oldingi darsni yakunlang'
          : 'Oldingi modulni yakunlang';
      }

      lessonStatuses.push({
        lesson,
        state,
        watchPercentage,
        testUnlocked: Boolean(test) && watchPercentage >= requirement,
        testPassed,
        testScore,
        completed,
        lockReason,
      });

      previousCompleted = completed;
    }

    const moduleCompletedLessons = lessonStatuses.filter((l) => l.completed).length;
    const backtestDone = backtests.some((b) => b.module_id === mod.id) || backtests.length > 0;
    const journalDone = journal.length > 0;
    const lessonsDone = lessons.length > 0 && moduleCompletedLessons === lessons.length;

    const moduleCompleted =
      lessonsDone &&
      (!mod.requires_backtest || backtestDone) &&
      (!mod.requires_journal || journalDone);

    moduleStatuses.push({
      module: mod,
      lessons: lessonStatuses,
      completedLessons: moduleCompletedLessons,
      totalLessons: lessons.length,
      percentage: lessons.length ? Math.round((moduleCompletedLessons / lessons.length) * 100) : 0,
      completed: moduleCompleted,
      unlocked: moduleUnlocked,
      requiresBacktest: Boolean(mod.requires_backtest),
      requiresJournal: Boolean(mod.requires_journal),
      backtestDone,
      journalDone,
    });

    previousModuleCompleted = moduleCompleted;
  }

  return {
    courseId,
    modules: moduleStatuses,
    totalLessons,
    completedLessons,
    percentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    completed: totalLessons > 0 && completedLessons === totalLessons,
    averageTestScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    nextLessonId,
  };
}

/** Is this specific lesson open for this user right now? */
export async function isLessonUnlocked(
  userId: string,
  lessonId: string
): Promise<{ unlocked: boolean; reason?: string }> {
  const lesson = await db.getLesson(lessonId);
  if (!lesson) return { unlocked: false, reason: 'Dars topilmadi' };

  const lessonModule = await db.getModule(lesson.module_id);
  if (!lessonModule) return { unlocked: false, reason: 'Modul topilmadi' };

  const status = await getCourseStatus(userId, lessonModule.course_id);
  for (const m of status.modules) {
    const found = m.lessons.find((l) => l.lesson.id === lessonId);
    if (found) {
      return found.state === 'locked'
        ? { unlocked: false, reason: found.lockReason }
        : { unlocked: true };
    }
  }
  return { unlocked: false, reason: 'Dars ushbu kursga tegishli emas' };
}

/** Has the user watched enough of the video to open the test? */
export async function isTestUnlocked(userId: string, lessonId: string): Promise<boolean> {
  const lesson = await db.getLesson(lessonId);
  if (!lesson) return false;
  const settings = await db.getSettings();
  const requirement = lesson.watch_requirement || settings.watch_requirement;
  const progress = await db.getLessonProgress(userId, lessonId);
  return (progress?.watch_percentage ?? 0) >= requirement;
}

/**
 * Called after a passing test. Awards lesson + test XP, then module and course
 * XP when those become complete, and issues the certificate on course
 * completion. Every award is idempotent.
 */
export async function completeLesson(userId: string, lessonId: string, score: number) {
  const settings = await db.getSettings();
  const lesson = await db.getLesson(lessonId);
  if (!lesson) return { xpAwarded: 0, moduleCompleted: false, courseCompleted: false, certificate: null };

  const lessonModule = await db.getModule(lesson.module_id);
  const courseId = lessonModule?.course_id;

  await db.saveProgress({
    user_id: userId,
    lesson_id: lessonId,
    test_passed: true,
    test_score: score,
    completed: true,
    completed_at: new Date().toISOString(),
    xp_earned: true,
  });

  let xpAwarded = 0;
  xpAwarded += (await db.awardXp(
    userId,
    lesson.xp_reward || settings.xp_lesson,
    `Dars yakunlandi: ${lesson.title}`,
    'lesson',
    lessonId
  )).granted;

  xpAwarded += (await db.awardXp(
    userId,
    settings.xp_test,
    `Test topshirildi: ${lesson.title}`,
    'test',
    lessonId
  )).granted;

  let moduleCompleted = false;
  let courseCompleted = false;
  let certificate = null;

  if (courseId) {
    const status = await getCourseStatus(userId, courseId);
    const moduleStatus = status.modules.find((m) => m.module.id === lesson.module_id);

    if (moduleStatus?.completed) {
      moduleCompleted = true;
      const granted = (await db.awardXp(
        userId,
        settings.xp_module,
        `Modul yakunlandi: ${moduleStatus.module.title}`,
        'module',
        moduleStatus.module.id
      )).granted;
      xpAwarded += granted;
      if (granted > 0) {
        await db.addNotification({
          user_id: userId,
          title: 'Modul yakunlandi 🏆',
          message: `"${moduleStatus.module.title}" moduli yakunlandi. +${settings.xp_module} XP.`,
          type: 'module_completed',
          link: `/course/${courseId}`,
        });
      }
    }

    if (status.completed) {
      courseCompleted = true;
      xpAwarded += (await db.awardXp(
        userId,
        settings.xp_course,
        'Kurs yakunlandi',
        'course',
        courseId
      )).granted;
      certificate = await issueCertificateIfEligible(userId, courseId);
    }
  }

  return { xpAwarded, moduleCompleted, courseCompleted, certificate };
}

/**
 * Certificate conditions (TZ §23): course 100% complete, every module done,
 * all required tests passed, and the required backtest + journal work present.
 */
export async function certificateEligibility(userId: string, courseId: string) {
  const status = await getCourseStatus(userId, courseId);
  const backtests = await db.getBacktests(userId);
  const journal = await db.getJournal(userId);

  // One query for every test, rather than one per lesson.
  const testLessonIds = new Set((await db.getTests()).map((t) => t.lesson_id));
  const lessonsWithTest = status.modules
    .flatMap((m) => m.lessons)
    .map((l) => ({ testPassed: l.testPassed, hasTest: testLessonIds.has(l.lesson.id) }));

  const checks = [
    { key: 'course', label: 'Kurs 100% tugallangan', ok: status.completed },
    { key: 'modules', label: 'Barcha modullar tugallangan', ok: status.modules.every((m) => m.completed) },
    {
      key: 'tests',
      label: 'Barcha testlar muvaffaqiyatli topshirilgan',
      ok: lessonsWithTest.every((l) => !l.hasTest || l.testPassed),
    },
    { key: 'backtest', label: 'Backtest bajarilgan', ok: backtests.length > 0 },
    { key: 'journal', label: 'Trading Journal to‘ldirilgan', ok: journal.length > 0 },
  ];

  return { eligible: checks.every((c) => c.ok), checks, status };
}

const COURSE_CERT_PREFIX: Record<string, string> = {
  standard: 'STD',
  pro: 'PRO',
  vip: 'VIP',
};

export function buildCertificateId(courseSlug: string, sequence: number): string {
  const prefix = COURSE_CERT_PREFIX[courseSlug] || courseSlug.slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  return `NE-${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}

export async function issueCertificateIfEligible(userId: string, courseId: string) {
  const { eligible } = await certificateEligibility(userId, courseId);
  if (!eligible) return null;

  const profile = await db.getProfile(userId);
  const course = await db.getCourse(courseId);
  if (!profile || !course) return null;

  const existing = (await db.getCertificates(userId)).find((c) => c.course_id === courseId && !c.revoked);
  if (existing) return existing;

  const certificate = await db.issueCertificate({
    certificate_id: buildCertificateId(course.slug, await db.nextCertificateSequence()),
    user_id: userId,
    course_id: courseId,
    full_name: profile.full_name,
    course_title: course.title,
  });

  await db.saveEnrollment({
    user_id: userId,
    course_id: courseId,
    completed_at: new Date().toISOString(),
  });

  await db.addNotification({
    user_id: userId,
    title: 'Sertifikat tayyor 🎓',
    message: `Tabriklaymiz! "${course.title}" kursi bo‘yicha sertifikatingiz tayyor: ${certificate.certificate_id}`,
    type: 'certificate_ready',
    link: '/profile',
  });

  return certificate;
}

/** Aggregate progress across every course the user is enrolled in. */
export async function getOverallProgress(userId: string) {
  const enrollments = await db.getEnrollments(userId);
  const courses = (
    await Promise.all(enrollments.map((e) => db.getCourse(e.course_id)))
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  const statuses = await Promise.all(courses.map((c) => getCourseStatus(userId, c.id)));
  const totalLessons = statuses.reduce((s, x) => s + x.totalLessons, 0);
  const completedLessons = statuses.reduce((s, x) => s + x.completedLessons, 0);
  const scored = statuses.filter((s) => s.averageTestScore > 0);

  return {
    courses,
    statuses,
    totalLessons,
    completedLessons,
    percentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    averageTestScore: scored.length
      ? Math.round(scored.reduce((s, x) => s + x.averageTestScore, 0) / scored.length)
      : 0,
  };
}

/**
 * Consecutive days of study, ending today or yesterday (TZ §10).
 *
 * A day counts when the student completed a lesson or took a test on it. The
 * streak is allowed to end yesterday so it does not appear broken before the
 * learner has studied today.
 */
export async function getLearningStreak(userId: string): Promise<{ current: number; longest: number }> {
  const [progress, attempts] = await Promise.all([db.getProgress(userId), db.getAttempts(userId)]);

  const days = new Set<string>();
  for (const p of progress) {
    if (p.completed && p.completed_at) days.add(p.completed_at.slice(0, 10));
  }
  for (const a of attempts) days.add(a.created_at.slice(0, 10));

  if (!days.size) return { current: 0, longest: 0 };

  const sorted = [...days].sort();
  const DAY = 24 * 60 * 60 * 1000;
  const dayNumber = (iso: string) => Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / DAY);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = dayNumber(sorted[i]) - dayNumber(sorted[i - 1]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // The current streak counts back from the most recent studied day, and only
  // survives if that day is today or yesterday.
  const today = Math.floor(Date.now() / DAY);
  const last = dayNumber(sorted[sorted.length - 1]);
  if (today - last > 1) return { current: 0, longest };

  let current = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (dayNumber(sorted[i]) - dayNumber(sorted[i - 1]) !== 1) break;
    current++;
  }

  return { current, longest };
}
