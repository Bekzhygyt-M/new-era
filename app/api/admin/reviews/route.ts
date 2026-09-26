import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminApi();
    const reviews = await Promise.all(
      (await db.getReviews()).map(async (r) => ({
        ...r,
        courseTitle: (await db.getCourse(r.course_id))?.title || null,
        userEmail: (await db.getProfile(r.user_id))?.email || null,
      }))
    );

    return NextResponse.json({
      reviews,
      pending: reviews.filter((r) => !r.approved).length,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const { id, approved } = await request.json();

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const ok = await db.setReviewApproval(id, Boolean(approved));
    if (!ok) return NextResponse.json({ error: 'Sharh topilmadi' }, { status: 404 });

    await db.logActivity(auth.profile.id, approved ? 'review_approved' : 'review_hidden', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });
    if (!await db.deleteReview(id)) {
      return NextResponse.json({ error: 'Sharh topilmadi' }, { status: 404 });
    }

    await db.logActivity(auth.profile.id, 'review_deleted', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
