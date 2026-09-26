import { NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { certificateEligibility, issueCertificateIfEligible } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificate/mine
 *
 * Lists the caller's certificates and, for any enrolled course that now meets
 * every condition, issues the certificate on the spot.
 */
export async function GET() {
  try {
    const { profile } = await requireUserApi();

    const enrollments = await db.getEnrollments(profile.id);

    // Courses are resolved in one pass and the per-course checks run together,
    // so the number of enrolled courses does not multiply the response time.
    const courses = (await Promise.all(enrollments.map((e) => db.getCourse(e.course_id)))).filter(
      (c): c is NonNullable<typeof c> => Boolean(c)
    );

    const evaluated = await Promise.all(
      courses.map(async (course) => ({ course, ...(await certificateEligibility(profile.id, course.id)) }))
    );

    const pending: { courseId: string; courseTitle: string; checks: { label: string; ok: boolean }[] }[] = [];

    for (const { course, eligible, checks } of evaluated) {
      if (eligible) {
        await issueCertificateIfEligible(profile.id, course.id);
      } else {
        pending.push({
          courseId: course.id,
          courseTitle: course.title,
          checks: checks.map((c) => ({ label: c.label, ok: c.ok })),
        });
      }
    }

    return NextResponse.json({
      certificates: (await db.getCertificates(profile.id)).filter((c) => !c.revoked),
      pending,
    });
  } catch (error) {
    return apiError(error);
  }
}
