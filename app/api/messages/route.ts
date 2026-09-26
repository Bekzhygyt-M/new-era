import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { messageSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Support thread. A user only ever sees their own conversation. */
export async function GET() {
  try {
    const { profile } = await requireUserApi();
    return NextResponse.json({ messages: await db.getMessages(profile.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUserApi();

    const limit = rateLimit(`messages:${profile.id}`, 20, 5 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Juda ko‘p xabar yuborildi.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const message = await db.saveMessage({
      user_id: profile.id,
      sender: 'user',
      text: parsed.data.text,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return apiError(error);
  }
}
