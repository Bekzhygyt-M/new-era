import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { receiptSubmissionSchema } from '@/lib/validations';
import { notifyPaymentSubmitted } from '@/lib/payments/provider';
import { isExpired } from '@/lib/payments/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/submit-receipt
 *
 * The order must exist, belong to the caller and still be inside its window.
 * Amount, course and order id come from the stored order — never from the
 * request body, so a client cannot pay 1 UZS for a 999 000 UZS course.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const body = await request.json();
    const parsed = receiptSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { paymentId, firstName, lastName, phone, receiptUrl, comment } = parsed.data;

    const payment = await db.getPayment(paymentId);
    if (!payment) throw new ApiError('Buyurtma topilmadi', 404);
    if (payment.user_id !== auth.profile.id) throw new ApiError('Ruxsat berilmagan', 403);

    if (payment.status === 'approved') throw new ApiError('Bu buyurtma allaqachon tasdiqlangan', 400);
    if (payment.status === 'cancelled') throw new ApiError('Buyurtma bekor qilingan', 400);

    if (isExpired(payment)) {
      await db.savePayment({ id: payment.id, status: 'expired' });
      throw new ApiError('Buyurtma muddati tugagan. Yangi buyurtma yarating.', 410);
    }

    // Receipts live in private storage and are served through /api/receipt.
    if (!receiptUrl.startsWith('/api/receipt/')) {
      throw new ApiError('Chek fayli noto‘g‘ri yuklangan', 400);
    }

    const saved = await db.savePayment({
      id: payment.id,
      status: 'receipt_submitted',
      first_name: firstName,
      last_name: lastName,
      phone,
      receipt_url: receiptUrl,
      comment: comment || null,
      submitted_at: new Date().toISOString(),
    });

    await db.logActivity(auth.profile.id, 'receipt_submitted', { order_id: saved.order_id });

    // The receipt is already stored, so a failed notification never loses it.
    const notified = await notifyPaymentSubmitted(saved);

    return NextResponse.json({
      success: true,
      message: 'Chek qabul qilindi va admin tekshiruviga yuborildi.',
      adminNotified: notified,
      payment: {
        id: saved.id,
        order_id: saved.order_id,
        status: saved.status,
        submitted_at: saved.submitted_at,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
