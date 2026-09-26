import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getSession, type SessionPayload } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { LocalProfile } from '@/lib/local-db';

/**
 * Server-side authorization.
 *
 * The signed session cookie proves *who* the caller is. It is never trusted for
 * *what they may do* — the role is always re-read from the database, so a
 * cookie minted before a demotion cannot keep admin access alive.
 */

export interface AuthContext {
  session: SessionPayload;
  profile: LocalProfile;
  isAdmin: boolean;
}

/** Current user, or null when unauthenticated / the account no longer exists. */
export async function getAuth(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session) return null;

  const profile = (await db.getProfile(session.sub)) || (await db.getProfile(session.email));
  if (!profile) return null;

  return { session, profile, isAdmin: profile.role === 'admin' };
}

export async function getCurrentProfile(): Promise<LocalProfile | null> {
  return (await getAuth())?.profile ?? null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAuth())?.isAdmin ?? false;
}

// ─── Page guards (Server Components) ─────────────────────────────────────────

/** Redirects to /login when signed out. Returns the auth context otherwise. */
export async function requireUserPage(returnTo?: string): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) {
    redirect(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login');
  }
  await db.touchProfile(auth.profile.id);
  return auth;
}

/** Redirects non-admins away from admin pages. */
export async function requireAdminPage(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect('/login?returnTo=%2Fadmin');
  if (!auth.isAdmin) redirect('/dashboard?error=forbidden');
  return auth;
}

// ─── API guards (Route Handlers) ─────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Throws ApiError(401) when signed out. */
export async function requireUserApi(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) throw new ApiError('Avtorizatsiyadan o‘ting', 401);
  return auth;
}

/** Throws ApiError(401/403) unless the caller is an admin. */
export async function requireAdminApi(): Promise<AuthContext> {
  const auth = await requireUserApi();
  if (!auth.isAdmin) throw new ApiError('Ruxsat berilmagan', 403);
  return auth;
}

/** Turns thrown ApiError / unknown errors into a JSON response. */
export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[api] unhandled error:', error);
  return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
}

// ─── Course access ───────────────────────────────────────────────────────────

/** Exact-match enrollment check. No fuzzy/substring matching. */
export async function hasEnrollment(userId: string, courseId: string): Promise<boolean> {
  return await db.hasEnrollment(userId, courseId);
}

export async function isCourseFree(courseId: string): Promise<boolean> {
  const course = await db.getCourse(courseId);
  return course ? course.price === 0 : false;
}

/**
 * Can this user open the course?
 * Admins yes; otherwise an active enrollment or a free course is required.
 */
export async function canAccessCourse(
  profile: LocalProfile | null,
  courseId?: string | null
): Promise<boolean> {
  if (!courseId) return false;
  if (profile?.role === 'admin') return true;
  if (profile && (await hasEnrollment(profile.id, courseId))) return true;
  return isCourseFree(courseId);
}

/** Resolve the course a lesson belongs to. */
export async function courseIdForLesson(lessonId: string): Promise<string | null> {
  const lesson = await db.getLesson(lessonId);
  if (!lesson) return null;
  return (await db.getModule(lesson.module_id))?.course_id ?? null;
}

export async function getTestPassingScore(testId?: string): Promise<number> {
  const settings = await db.getSettings();
  if (testId) {
    const test = await db.getTest(testId);
    if (test?.passing_score) return test.passing_score;
  }
  return settings.passing_score;
}
