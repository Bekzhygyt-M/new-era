import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { paymentMethodSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminApi();
    return NextResponse.json({ methods: await db.getPaymentMethods() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = paymentMethodSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const method = await db.savePaymentMethod(parsed.data);
    await db.logActivity(auth.profile.id, 'payment_method_saved', { method: method.name });

    return NextResponse.json({ success: true, method });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminApi();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const deleted = await db.deletePaymentMethod(id);
    if (!deleted) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
