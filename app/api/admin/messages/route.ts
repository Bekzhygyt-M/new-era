import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { messageSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** Support inbox: thread list, or one student's thread via ?userId=. */
export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const userId = new URL(request.url).searchParams.get('userId');

    if (userId) {
      return NextResponse.json({
        messages: await db.getMessages(userId),
        user: await db.getProfile(userId),
      });
    }

    const threads = await Promise.all(
      (await db.getAllMessageThreads()).map(async (t) => ({
        ...t,
        user: await db.getProfile(t.user_id),
      }))
    );

    return NextResponse.json({ threads });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (!body.userId) throw new ApiError('userId kerak', 400);
    if (!await db.getProfile(body.userId)) throw new ApiError('Foydalanuvchi topilmadi', 404);

    await db.markNotificationRead(body.userId);
    const message = await db.saveMessage({
      user_id: body.userId,
      sender: 'admin',
      text: parsed.data.text,
      read: true,
    });

    await db.addNotification({
      user_id: body.userId,
      title: 'Yangi javob 💬',
      message: 'Qo‘llab-quvvatlash xizmatidan yangi xabar keldi.',
      type: 'support_reply',
      link: '/messages',
    });

    await db.logActivity(auth.profile.id, 'support_reply', { target: body.userId });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return apiError(error);
  }
}
