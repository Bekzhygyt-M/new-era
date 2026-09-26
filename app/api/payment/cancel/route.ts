import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { cancelPayment } from '@/lib/payments/service';

export const dynamic = 'force-dynamic';

/** POST /api/payment/cancel — the payer cancels their own pending order. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'To‘lov ID kerak' }, { status: 400 });
    }

    const result = await cancelPayment(paymentId, auth.profile.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: 'cancelled' });
  } catch (error) {
    return apiError(error);
  }
}
