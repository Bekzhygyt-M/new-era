import { NextRequest, NextResponse } from 'next/server';
import { requireUserApi, apiError } from '@/lib/permissions';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireUserApi();
    const notifications = await db.getNotifications(profile.id);
    return NextResponse.json({
      notifications,
      unread: notifications.filter((n) => !n.read).length,
    });
  } catch (error) {
    return apiError(error);
  }
}

/** POST /api/notifications — marks one notification, or all of them, as read. */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireUserApi();
    const body = await request.json().catch(() => ({}));
    const count = await db.markNotificationRead(profile.id, body.id);
    return NextResponse.json({ success: true, marked: count });
  } catch (error) {
    return apiError(error);
  }
}
