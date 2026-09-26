import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { paymentRejectionSchema } from '@/lib/validations';
import { rejectPayment } from '@/lib/payments/service';

export const dynamic = 'force-dynamic';

/** POST /api/payment/reject — admin only; a reason is mandatory (TZ §20). */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const body = await request.json();
    const parsed = paymentRejectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const result = await rejectPayment(parsed.data.paymentId, parsed.data.reason, auth.profile.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'To‘lov rad etildi va foydalanuvchi xabardor qilindi.',
      payment: result.payment,
    });
  } catch (error) {
    return apiError(error);
  }
}
