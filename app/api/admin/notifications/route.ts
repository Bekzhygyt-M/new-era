import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, apiError, ApiError } from '@/lib/permissions';
import { db } from '@/lib/db';
import { broadcastSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminApi();
    const notifications = (await db.raw()).notifications.slice(0, 100);
    return NextResponse.json({ notifications });
  } catch (error) {
    return apiError(error);
  }
}

/** POST /api/admin/notifications — broadcast, or notify one student (TZ §22). */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    const parsed = broadcastSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { title, message, type, link, target, userId } = parsed.data;

    if (target === 'user') {
      if (!userId) throw new ApiError('userId kerak', 400);
      if (!await db.getProfile(userId)) throw new ApiError('Foydalanuvchi topilmadi', 404);

      await db.addNotification({ user_id: userId, title, message, type, link: link || null });
      await db.logActivity(auth.profile.id, 'notification_sent', { target: userId });
      return NextResponse.json({ success: true, recipients: 1 });
    }

    // A single 'all' row is fanned out at read time, so a broadcast stays cheap.
    await db.addNotification({ user_id: 'all', title, message, type, link: link || null });
    await db.logActivity(auth.profile.id, 'broadcast_sent', { title });

    return NextResponse.json({
      success: true,
      recipients: (await db.getProfiles()).filter((p) => p.role === 'student').length,
    });
  } catch (error) {
    return apiError(error);
  }
}
