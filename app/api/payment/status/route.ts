import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { isExpired, remainingSeconds } from '@/lib/payments/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment/status?paymentId=...
 *
 * The authoritative countdown: `remainingSeconds` is computed from the stored
 * deadline, so a client that pauses its timer gains nothing (TZ §19).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const paymentId = new URL(request.url).searchParams.get('paymentId');

    if (!paymentId) throw new ApiError('paymentId kerak', 400);

    const payment = await db.getPayment(paymentId);
    if (!payment) throw new ApiError('Buyurtma topilmadi', 404);
    if (payment.user_id !== auth.profile.id && !auth.isAdmin) {
      throw new ApiError('Ruxsat berilmagan', 403);
    }

    if (isExpired(payment)) {
      await db.savePayment({ id: payment.id, status: 'expired' });
      payment.status = 'expired';
    }

    return NextResponse.json({
      id: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      courseId: payment.course_id,
      courseTitle: payment.courses?.title || null,
      expiresAt: payment.expires_at,
      remainingSeconds: remainingSeconds(payment),
      submittedAt: payment.submitted_at || null,
      approvedAt: payment.approved_at || null,
      rejectedAt: payment.rejected_at || null,
      rejectionReason: payment.rejection_reason || null,
      enrolled: await db.hasEnrollment(payment.user_id, payment.course_id),
    });
  } catch (error) {
    return apiError(error);
  }
}
