import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { paymentCreateSchema } from '@/lib/validations';
import { isValidProvider } from '@/lib/payments/provider';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/create — opens an order with a server-side deadline.
 *
 * `expires_at` is computed here from the platform's configured window (default
 * 15 minutes, TZ §19). The browser countdown is display only; every later step
 * re-checks the stored deadline.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserApi();

    const limit = rateLimit(`payment:create:${auth.profile.id}`, 10, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Juda ko‘p buyurtma yaratildi. Keyinroq urinib ko‘ring.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = paymentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { courseId, provider, period } = parsed.data;

    const course = await db.getCourse(courseId);
    if (!course || !course.published) throw new ApiError('Kurs topilmadi', 404);
    if (!isValidProvider(provider)) throw new ApiError('Noto‘g‘ri to‘lov usuli', 400);

    if (await db.hasEnrollment(auth.profile.id, course.id)) {
      throw new ApiError('Bu kurs sizda allaqachon ochiq', 400);
    }

    await db.expireStalePayments();

    const settings = await db.getSettings();

    const pricing = settings.pricing?.[course.slug as 'standard' | 'pro'];
    const calculatedAmount = pricing?.[period as 'daily' | 'monthly' | 'yearly'] || course.price;

    // Re-use a live order if same period and course
    const active = (await db.getPayments(auth.profile.id))
      .find(
        (p) =>
          p.course_id === course.id &&
          (p.status === 'pending' || p.status === 'receipt_submitted') &&
          (!p.expires_at || new Date(p.expires_at).getTime() > Date.now()) &&
          p.amount === calculatedAmount
      );

    const payment =
      active ||
      await db.savePayment({
        user_id: auth.profile.id,
        course_id: course.id,
        amount: calculatedAmount,
        currency: course.currency,
        provider,
        status: 'pending',
        first_name: auth.profile.first_name,
        last_name: auth.profile.last_name,
        phone: auth.profile.phone,
        expires_at: new Date(Date.now() + settings.payment_window_minutes * 60 * 1000).toISOString(),
        ...({ period } as Record<string, unknown>),
      });

    await db.logActivity(auth.profile.id, 'payment_created', {
      order_id: payment.order_id,
      course_id: course.id,
      period,
      amount: calculatedAmount,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      expiresAt: payment.expires_at,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      courseTitle: course.title,
      windowMinutes: settings.payment_window_minutes,
      instructions: settings.payment_instructions,
      cardNumber: settings.card_number,
      cardHolder: settings.card_holder,
      cards: settings.cards || [],
    });
  } catch (error) {
    return apiError(error);
  }
}
