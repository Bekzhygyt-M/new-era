import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { reviewSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** GET /api/reviews — approved reviews only (TZ §22.x moderation). */
export async function GET(request: NextRequest) {
  const courseId = new URL(request.url).searchParams.get('courseId') || undefined;
  const reviews = await db.getReviews({ approvedOnly: true, courseId });

  return NextResponse.json({
    reviews: await Promise.all(
      reviews.map(async (r) => ({
        id: r.id,
        author_name: r.author_name,
        rating: r.rating,
        content: r.content,
        created_at: r.created_at,
        course_id: r.course_id,
        courseTitle: (await db.getCourse(r.course_id))?.title || null,
      }))
    ),
    averageRating: reviews.length
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2))
      : null,
    total: reviews.length,
  });
}

/** Only a student who actually owns the course may review it. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const parsed = reviewSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { course_id, rating, content } = parsed.data;

    if (!await db.getCourse(course_id)) throw new ApiError('Kurs topilmadi', 404);
    if (!await db.hasEnrollment(auth.profile.id, course_id)) {
      throw new ApiError('Sharh qoldirish uchun kursni sotib olgan bo‘lishingiz kerak', 403);
    }

    const review = await db.saveReview({
      user_id: auth.profile.id,
      course_id,
      author_name: auth.profile.full_name,
      rating,
      content,
      approved: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Sharhingiz qabul qilindi va moderatsiyadan keyin chop etiladi.',
      review: { id: review.id, approved: review.approved },
    });
  } catch (error) {
    return apiError(error);
  }
}
